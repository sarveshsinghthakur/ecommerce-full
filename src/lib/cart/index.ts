import "server-only";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { carts, cartItems, products, productVariants } from "@/db/schema";
import { newId, newToken } from "@/lib/ids";
import { addMoney, formatMoney, toMinorUnits } from "@/lib/money";

/** Cookie holding the anonymous cart id. httpOnly; never readable by JS. */
export const GUEST_CART_COOKIE = "aurora_cart";
export const GUEST_CART_MAX_AGE = 60 * 60 * 24 * 30;

import {
  MAX_CART_LINES,
  MAX_LINE_QUANTITY,
  type CartLine,
  type CartView,
} from "./types";

export { MAX_CART_LINES, MAX_LINE_QUANTITY };
export type { CartLine, CartView };

export class CartError extends Error {
  readonly code:
    | "not_found"
    | "line_limit"
    | "quantity_limit"
    | "unavailable"
    | "invalid";
  constructor(
    code: CartError["code"],
    message: string,
  ) {
    super(message);
    this.name = "CartError";
    this.code = code;
  }
}

type Db = typeof db;

/* ------------------------------- resolution -------------------------------- */

interface ResolvedCart {
  id: string;
  userId: string | null;
  sessionId: string | null;
}

export async function getOrCreateCart(
  identity: { userId?: string | null; guestToken?: string | null },
  executor: Db = db,
): Promise<ResolvedCart> {
  if (identity.userId) {
    const [existing] = await executor
      .select()
      .from(carts)
      .where(eq(carts.userId, identity.userId))
      .limit(1);
    if (existing) return { id: existing.id, userId: existing.userId, sessionId: null };

    const id = newId("crt");
    const [created] = await executor
      .insert(carts)
      .values({ id, userId: identity.userId })
      .onConflictDoNothing()
      .returning();
    if (created) return { id: created.id, userId: identity.userId, sessionId: null };
    // Lost a race with a concurrent request — re-read.
    const [again] = await executor
      .select()
      .from(carts)
      .where(eq(carts.userId, identity.userId))
      .limit(1);
    if (again) return { id: again.id, userId: again.userId, sessionId: null };
    throw new CartError("invalid", "Could not create a cart for this account.");
  }

  const token = identity.guestToken || newToken(24);
  const [existing] = await executor
    .select()
    .from(carts)
    .where(eq(carts.sessionId, token))
    .limit(1);
  if (existing) return { id: existing.id, userId: null, sessionId: token };

  const id = newId("crt");
  await executor
    .insert(carts)
    .values({ id, sessionId: token })
    .onConflictDoNothing()
    .returning();
  const [created] = await executor
    .select()
    .from(carts)
    .where(eq(carts.sessionId, token))
    .limit(1);
  if (!created) throw new CartError("invalid", "Could not create a guest cart.");
  return { id: created.id, userId: null, sessionId: token };
}

/* -------------------------------- reading ---------------------------------- */

const lineSelect = {
  id: cartItems.id,
  productId: cartItems.productId,
  variantId: cartItems.variantId,
  quantity: cartItems.quantity,
  title: products.title,
  slug: products.slug,
  brand: products.brand,
  availability: products.availability,
  sellingPrice: products.sellingPrice,
  referencePrice: products.referencePrice,
  currency: products.currency,
  stockQuantity: products.stockQuantity,
  status: products.status,
  imageSql: sql<string | null>`(
    select url from product_images pi
    where pi.product_id = products.id
    order by pi.position asc, pi.id asc
    limit 1
  )`,
};

export async function getCartView(
  cartId: string,
  kind: "user" | "guest",
  executor: Db = db,
): Promise<CartView> {
  const rows = await executor
    .select(lineSelect)
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(eq(cartItems.cartId, cartId));

  const lines: CartLine[] = rows
    .filter((row) => row.status === "published")
    .map((row) => ({
      id: row.id,
      productId: row.productId,
      variantId: row.variantId,
      quantity: row.quantity,
      title: row.title,
      slug: row.slug,
      imageUrl: row.imageSql,
      sellingPrice: row.sellingPrice ?? "0.00",
      referencePrice: row.referencePrice,
      currency: row.currency,
      availability: row.availability,
      purchasable:
        row.availability !== "out_of_stock" && row.availability !== "preorder",
      brand: row.brand,
      lineTotal: multiplyMoney(row.sellingPrice ?? "0", row.quantity),
      stockQuantity: row.stockQuantity,
    }));

  const subtotal = lines.reduce(
    (acc, line) => addMoney(acc, line.lineTotal),
    "0.00",
  );
  const itemCount = lines.reduce((acc, line) => acc + line.quantity, 0);

  return {
    id: cartId,
    kind,
    lines,
    itemCount,
    subtotal,
    currency: lines[0]?.currency ?? "INR",
  };
}

/** Multiplies a decimal string by an integer without float error. */
export function multiplyMoney(value: string, times: number): string {
  if (times <= 0) return "0.00";
  const minor = toMinorUnits(value) * BigInt(times);
  const negative = minor < 0n;
  const abs = negative ? -minor : minor;
  const whole = abs / 100n;
  const frac = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${frac}`;
}

/* -------------------------------- writing ---------------------------------- */

export async function addToCart(
  cartId: string,
  input: { productId: string; variantId?: string | null; quantity?: number },
  executor: Db = db,
): Promise<CartView> {
  const quantity = clampQuantity(input.quantity ?? 1);
  const [product] = await executor
    .select({
      id: products.id,
      status: products.status,
      availability: products.availability,
    })
    .from(products)
    .where(eq(products.id, input.productId))
    .limit(1);
  if (!product) throw new CartError("not_found", "That product no longer exists.");
  if (product.status !== "published") {
    throw new CartError("unavailable", "That product is not available.");
  }
  if (product.availability === "out_of_stock") {
    throw new CartError("unavailable", "That product is out of stock.");
  }

  const currentCount = await countCartLines(cartId, executor);
  const existing = await findLine(cartId, input.productId, input.variantId ?? null, executor);

  if (!existing && currentCount >= MAX_CART_LINES) {
    throw new CartError("line_limit", `A cart can hold at most ${MAX_CART_LINES} items.`);
  }

  const nextQty = Math.min(
    MAX_LINE_QUANTITY,
    (existing?.quantity ?? 0) + quantity,
  );

  if (existing) {
    await executor
      .update(cartItems)
      .set({ quantity: nextQty })
      .where(eq(cartItems.id, existing.id));
  } else {
    await executor.insert(cartItems).values({
      id: newId("crti"),
      cartId,
      productId: input.productId,
      variantId: input.variantId ?? null,
      quantity: nextQty,
    });
  }

  await touchCart(cartId, executor);
  return getCartView(cartId, "guest", executor);
}

export async function updateCartItem(
  cartId: string,
  itemId: string,
  quantity: number,
  executor: Db = db,
): Promise<CartView> {
  if (!Number.isInteger(quantity)) {
    throw new CartError("invalid", "Quantity must be a whole number.");
  }
  if (quantity <= 0) {
    return removeCartItem(cartId, itemId, executor);
  }
  const [line] = await executor
    .select()
    .from(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)))
    .limit(1);
  if (!line) throw new CartError("not_found", "That item is not in your cart.");

  await executor
    .update(cartItems)
    .set({ quantity: Math.min(MAX_LINE_QUANTITY, quantity) })
    .where(eq(cartItems.id, itemId));

  await touchCart(cartId, executor);
  return getCartView(cartId, "guest", executor);
}

export async function removeCartItem(
  cartId: string,
  itemId: string,
  executor: Db = db,
): Promise<CartView> {
  await executor
    .delete(cartItems)
    .where(and(eq(cartItems.id, itemId), eq(cartItems.cartId, cartId)));
  await touchCart(cartId, executor);
  return getCartView(cartId, "guest", executor);
}

export async function clearCart(cartId: string, executor: Db = db): Promise<void> {
  await executor.delete(cartItems).where(eq(cartItems.cartId, cartId));
  await touchCart(cartId, executor);
}

/**
 * Merges a guest cart into the user's cart after sign-in.
 *
 * Quantities are summed on conflict (capped at MAX_LINE_QUANTITY) and the
 * guest cart is tombstoned so it can never be re-used.
 */
export async function mergeGuestCart(
  userId: string,
  guestCartId: string,
  executor: Db = db,
): Promise<CartView> {
  const userCart = await getOrCreateCart({ userId }, executor);
  if (userCart.id === guestCartId) return getCartView(userCart.id, "user", executor);

  const guestLines = await executor
    .select()
    .from(cartItems)
    .where(eq(cartItems.cartId, guestCartId));

  if (guestLines.length > 0) {
    const ownLines = await executor
      .select()
      .from(cartItems)
      .where(eq(cartItems.cartId, userCart.id));
    const byKey = new Map(
      ownLines.map((l) => [`${l.productId}::${l.variantId ?? ""}`, l]),
    );

    for (const line of guestLines) {
      const key = `${line.productId}::${line.variantId ?? ""}`;
      const target = byKey.get(key);
      if (target) {
        await executor
          .update(cartItems)
          .set({
            quantity: Math.min(MAX_LINE_QUANTITY, target.quantity + line.quantity),
          })
          .where(eq(cartItems.id, target.id));
        await executor.delete(cartItems).where(eq(cartItems.id, line.id));
      } else {
        await executor
          .update(cartItems)
          .set({ cartId: userCart.id })
          .where(eq(cartItems.id, line.id));
      }
    }
  }

  await executor
    .update(carts)
    .set({ mergedIntoId: userCart.id, sessionId: null })
    .where(eq(carts.id, guestCartId));
  await touchCart(userCart.id, executor);
  return getCartView(userCart.id, "user", executor);
}

/* -------------------------------- helpers ---------------------------------- */

function clampQuantity(value: number): number {
  if (!Number.isFinite(value) || value < 1) {
    throw new CartError("invalid", "Quantity must be at least 1.");
  }
  return Math.min(MAX_LINE_QUANTITY, Math.floor(value));
}

async function countCartLines(cartId: string, executor: Db): Promise<number> {
  const [row] = await executor
    .select({ n: sql<number>`count(*)::int` })
    .from(cartItems)
    .where(eq(cartItems.cartId, cartId));
  return row?.n ?? 0;
}

function findLine(
  cartId: string,
  productId: string,
  variantId: string | null,
  executor: Db,
) {
  return executor
    .select()
    .from(cartItems)
    .where(
      and(
        eq(cartItems.cartId, cartId),
        eq(cartItems.productId, productId),
        variantId ? eq(cartItems.variantId, variantId) : isNull(cartItems.variantId),
      ),
    )
    .limit(1)
    .then((rows) => rows[0] ?? null);
}

async function touchCart(cartId: string, executor: Db): Promise<void> {
  await executor
    .update(carts)
    .set({ updatedAt: new Date() })
    .where(eq(carts.id, cartId));
}

/** Formats a subtotal for display using the cart's currency. */
export function formatCartTotal(view: CartView): string {
  return formatMoney(view.subtotal, view.currency);
}

export async function loadVariant(
  variantId: string,
  executor: Db = db,
): Promise<typeof productVariants.$inferSelect | null> {
  const [row] = await executor
    .select()
    .from(productVariants)
    .where(eq(productVariants.id, variantId))
    .limit(1);
  return row ?? null;
}

export async function cartHasProduct(
  cartId: string,
  productIds: string[],
  executor: Db = db,
): Promise<string[]> {
  if (productIds.length === 0) return [];
  const rows = await executor
    .select({ productId: cartItems.productId })
    .from(cartItems)
    .where(and(eq(cartItems.cartId, cartId), inArray(cartItems.productId, productIds)));
  return rows.map((r) => r.productId);
}
