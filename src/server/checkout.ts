import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  carts,
  cartItems,
  orderItems,
  orderStatusHistory,
  orders,
  payments,
  products,
  productVariants,
  userAddresses,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import {
  FLAT_SHIPPING_FEE,
  FREE_SHIPPING_THRESHOLD,
  type PaymentMethod,
  type ShippingAddressInput,
} from "@/lib/checkout-policy";
import type { CheckoutLine, CheckoutSummary, SavedAddress } from "@/lib/checkout-types";
import { serverEnv } from "@/lib/env";
import { newId, newToken } from "@/lib/ids";
import { addMoney, cmpMoney, toMinorUnits } from "@/lib/money";

type Db = typeof db;

export type { CheckoutLine, CheckoutSummary, SavedAddress };

export class CheckoutError extends Error {
  readonly code:
    | "empty"
    | "unavailable"
    | "stock"
    | "price_changed"
    | "invalid_address"
    | "not_configured"
    | "conflict";
  /** Cart item ids the user needs to fix (remove or reduce). */
  readonly itemIds: string[];
  constructor(code: CheckoutError["code"], message: string, itemIds: string[] = []) {
    super(message);
    this.name = "CheckoutError";
    this.code = code;
    this.itemIds = itemIds;
  }
}

/* --------------------------------- reading -------------------------------- */

interface CheckoutRow {
  cartItemId: string;
  quantity: number;
  variantId: string | null;
  productId: string;
  slug: string;
  title: string;
  brand: string | null;
  status: string;
  currency: string;
  productPrice: string | null;
  productSourcePrice: string | null;
  productMarkup: string | null;
  referencePrice: string | null;
  productStock: number | null;
  productAvailability: string;
  variantName: string | null;
  variantPrice: string | null;
  variantSourcePrice: string | null;
  variantStock: number | null;
  variantAvailability: string | null;
  imageUrl: string | null;
}

const checkoutLineSelect = {
  cartItemId: cartItems.id,
  quantity: cartItems.quantity,
  variantId: cartItems.variantId,
  productId: products.id,
  slug: products.slug,
  title: products.title,
  brand: products.brand,
  status: products.status,
  currency: products.currency,
  productPrice: products.sellingPrice,
  productSourcePrice: products.sourcePrice,
  productMarkup: products.markupPercent,
  referencePrice: products.referencePrice,
  productStock: products.stockQuantity,
  productAvailability: products.availability,
  variantName: productVariants.name,
  variantPrice: productVariants.sellingPrice,
  variantSourcePrice: productVariants.sourcePrice,
  variantStock: productVariants.stockQuantity,
  variantAvailability: productVariants.availability,
  imageUrl: sql<string | null>`(
    select pi.url from product_images pi
    where pi.product_id = products.id
    order by pi.position asc, pi.id asc
    limit 1
  )`,
};

const unitPriceOf = (row: CheckoutRow): string =>
  (row.variantId ? row.variantPrice : row.productPrice) ?? "0.00";

const stockOf = (row: CheckoutRow): number | null =>
  row.variantId ? row.variantStock : row.productStock;

const availabilityOf = (row: CheckoutRow): string =>
  (row.variantId ? row.variantAvailability : row.productAvailability) ?? "unknown";

function blockReason(row: CheckoutRow): string | null {
  if (row.status !== "published") return "This product is no longer available.";
  if (cmpMoney(unitPriceOf(row), "0.00") <= 0) return "This product has no valid price.";
  const availability = availabilityOf(row);
  if (availability === "out_of_stock") return "Out of stock.";
  if (availability === "preorder") return "Preorders cannot be checked out yet.";
  const stock = stockOf(row);
  if (stock !== null && stock < row.quantity)
    return stock <= 0 ? "Out of stock." : `Only ${stock} left — reduce the quantity.`;
  return null;
}

function multiply(value: string, times: number): string {
  const minor = toMinorUnits(value) * BigInt(Math.max(0, times));
  const whole = minor / 100n;
  const frac = (minor % 100n).toString().padStart(2, "0");
  return `${whole}.${frac}`;
}

async function readCheckoutLines(cartId: string, executor: Db): Promise<CheckoutLine[]> {
  const rows = await executor
    .select(checkoutLineSelect)
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .leftJoin(productVariants, eq(cartItems.variantId, productVariants.id))
    .where(eq(cartItems.cartId, cartId));

  return (rows as CheckoutRow[]).map((row) => {
    const reason = blockReason(row);
    return {
      id: row.cartItemId,
      productId: row.productId,
      variantId: row.variantId,
      quantity: row.quantity,
      title: row.title,
      variantName: row.variantId ? row.variantName : null,
      slug: row.slug,
      imageUrl: row.imageUrl,
      brand: row.brand,
      currency: row.currency,
      unitPrice: unitPriceOf(row),
      sourcePrice: (row.variantId ? row.variantSourcePrice : row.productSourcePrice) ?? null,
      markupPercent: row.productMarkup,
      referencePrice: row.referencePrice,
      lineTotal: multiply(unitPriceOf(row), row.quantity),
      stockQuantity: stockOf(row),
      blocked: reason !== null,
      blockedReason: reason,
    };
  });
}

export async function listSavedAddresses(
  userId: string,
  executor: Db = db,
): Promise<SavedAddress[]> {
  const rows = await executor
    .select()
    .from(userAddresses)
    .where(eq(userAddresses.userId, userId))
    .orderBy(userAddresses.isDefaultShipping, userAddresses.createdAt);
  return rows.map((row) => ({
    id: row.id,
    label: row.label,
    fullName: row.fullName,
    phone: row.phone,
    line1: row.line1,
    line2: row.line2,
    city: row.city,
    state: row.state,
    postalCode: row.postalCode,
    country: row.country,
    isDefaultShipping: row.isDefaultShipping,
  }));
}

function computeTotals(lines: { lineTotal: string }[]) {
  const subtotal = lines.reduce((acc, line) => addMoney(acc, line.lineTotal), "0.00");
  const shipping =
    toMinorUnits(subtotal) >= toMinorUnits(String(FREE_SHIPPING_THRESHOLD))
      ? "0.00"
      : `${FLAT_SHIPPING_FEE}.00`;
  return { subtotal, shipping, total: addMoney(subtotal, shipping) };
}

export async function getCheckoutSummary(
  userId: string,
  profile: { fullName: string; email: string; phone: string | null },
  executor: Db = db,
): Promise<CheckoutSummary> {
  const [cart] = await executor
    .select({ id: carts.id })
    .from(carts)
    .where(eq(carts.userId, userId))
    .limit(1);

  const lines = cart ? await readCheckoutLines(cart.id, executor) : [];
  const usable = lines.filter((line) => !line.blocked);
  const { subtotal, shipping, total } = computeTotals(usable);

  const env = serverEnv();
  const onlineConfigured = Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
  const testPaymentsAvailable = env.NODE_ENV !== "production";

  const paymentMethods: PaymentMethod[] = ["cod"];
  if (onlineConfigured) paymentMethods.push("razorpay");
  if (testPaymentsAvailable) paymentMethods.push("test");

  return {
    lines,
    itemCount: usable.reduce((acc, line) => acc + line.quantity, 0),
    subtotal,
    shipping,
    total,
    currency: lines[0]?.currency ?? env.DEFAULT_CURRENCY,
    qualifiesForFreeShipping: toMinorUnits(shipping) === 0n,
    addresses: await listSavedAddresses(userId, executor),
    profile,
    paymentMethods,
    onlineConfigured,
    testPaymentsAvailable,
  };
}

/* -------------------------------- writing --------------------------------- */

export interface PlaceOrderInput {
  userId: string;
  email: string;
  address: ShippingAddressInput;
  saveAddress?: boolean;
  paymentMethod: PaymentMethod;
  idempotencyKey: string;
  notes?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

export interface PlaceOrderResult {
  orderId: string;
  orderNumber: string;
  total: string;
  currency: string;
  paymentMethod: PaymentMethod;
  /** True when this idempotency key had already produced an order. */
  replayed?: boolean;
}

function normalizeAddress(input: ShippingAddressInput) {
  const address = {
    fullName: input.fullName.trim(),
    phone: input.phone.trim(),
    line1: input.line1.trim(),
    line2: input.line2?.trim() || null,
    city: input.city.trim(),
    state: input.state.trim(),
    postalCode: input.postalCode.trim(),
    country: (input.country ?? "IN").trim().toUpperCase().slice(0, 2),
    label: (input.label ?? "Home").trim().slice(0, 40) || "Home",
  };
  if (
    !address.fullName ||
    !address.phone ||
    !address.line1 ||
    !address.city ||
    !address.state ||
    !address.postalCode
  ) {
    throw new CheckoutError("invalid_address", "Fill in every required address field.");
  }
  if (!/^[+\d][\d\s-]{7,17}$/.test(address.phone)) {
    throw new CheckoutError("invalid_address", "Enter a valid phone number.");
  }
  if (address.postalCode.length < 4 || address.postalCode.length > 10) {
    throw new CheckoutError("invalid_address", "Enter a valid postal code.");
  }
  return address;
}

function generateOrderNumber(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  return `AS-${date}-${newToken(4).toUpperCase().slice(0, 6)}`;
}

/**
 * Idempotency lookup. Runs *before* any cart validation so a retried submit
 * (double click, flaky network) returns the order that already exists instead
 * of failing on the now-empty cart.
 */
async function findExistingOrder(
  userId: string,
  idempotencyKey: string,
): Promise<PlaceOrderResult | null> {
  const [order] = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      currency: orders.currency,
      paymentMethod: orders.paymentProvider,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)))
    .limit(1);
  if (!order) return null;
  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    total: order.total,
    currency: order.currency,
    paymentMethod: (order.paymentMethod ?? "cod") as PaymentMethod,
    replayed: true,
  };
}

/**
 * Creates an order from the current cart.
 *
 * Prices and stock are re-read inside the transaction so a change between page
 * load and submit can never be silently accepted — the caller gets `stock` or
 * `unavailable` and the user is asked to fix the cart.
 */
export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const env = serverEnv();
  const address = normalizeAddress(input.address);

  const replay = await findExistingOrder(input.userId, input.idempotencyKey);
  if (replay) return replay;

  if (input.paymentMethod === "razorpay" && !(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET)) {
    throw new CheckoutError("not_configured", "Online payments are not configured.");
  }
  if (input.paymentMethod === "test" && env.NODE_ENV === "production") {
    throw new CheckoutError("not_configured", "Test payments are disabled.");
  }

  return db.transaction(async (tx) => {
    const [cart] = await tx
      .select({ id: carts.id })
      .from(carts)
      .where(eq(carts.userId, input.userId))
      .limit(1);
    if (!cart) throw new CheckoutError("empty", "Your cart is empty.");

    const lines = await readCheckoutLines(cart.id, tx);
    if (lines.length === 0) throw new CheckoutError("empty", "Your cart is empty.");

    const blocked = lines.filter((line) => line.blocked);
    if (blocked.length > 0) {
      const reason = blocked[0]!.blockedReason ?? "Some items can no longer be purchased.";
      throw new CheckoutError(
        reason.includes("Only") ? "stock" : "unavailable",
        `${reason} Update your cart to continue.`,
        blocked.map((line) => line.id),
      );
    }

    // Reserve stock atomically: the WHERE clause makes a concurrent checkout
    // lose the race instead of overselling.
    for (const line of lines) {
      if (line.stockQuantity === null) continue;
      const updated = line.variantId
        ? await tx
            .update(productVariants)
            .set({ stockQuantity: sql`${productVariants.stockQuantity} - ${line.quantity}` })
            .where(
              and(
                eq(productVariants.id, line.variantId),
                sql`${productVariants.stockQuantity} >= ${line.quantity}`,
              ),
            )
        : await tx
            .update(products)
            .set({ stockQuantity: sql`${products.stockQuantity} - ${line.quantity}` })
            .where(
              and(
                eq(products.id, line.productId),
                sql`${products.stockQuantity} >= ${line.quantity}`,
              ),
            );
      if ((updated.rowCount ?? 0) === 0) {
        throw new CheckoutError(
          "stock",
          `“${line.title}” sold out while you were checking out.`,
          [line.id],
        );
      }
    }

    const { subtotal, shipping, total } = computeTotals(lines);
    const orderId = newId("ord");
    const orderNumber = generateOrderNumber();
    const isCod = input.paymentMethod === "cod";

    const [created] = await tx
      .insert(orders)
      .values({
        id: orderId,
        orderNumber,
        userId: input.userId,
        email: input.email,
        fullName: address.fullName,
        phone: address.phone,
        shippingAddress: address,
        status: isCod ? "confirmed" : "pending_payment",
        paymentStatus: isCod ? "cod_pending" : "pending",
        paymentProvider: input.paymentMethod,
        currency: lines[0]!.currency,
        subtotal,
        shippingAmount: shipping,
        taxAmount: "0.00",
        discountAmount: "0.00",
        total,
        notes: input.notes?.trim() || null,
        idempotencyKey: input.idempotencyKey,
      })
      .returning({ id: orders.id });
    if (!created) throw new CheckoutError("conflict", "Could not create the order.");

    await tx.insert(orderItems).values(
      lines.map((line) => ({
        id: newId("oit"),
        orderId,
        productId: line.productId,
        variantId: line.variantId,
        productSlug: line.slug,
        title: line.title,
        variantName: line.variantName,
        imageUrl: line.imageUrl,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        sourcePrice: line.sourcePrice,
        markupPercent: line.markupPercent,
        taxAmount: "0.00",
        lineTotal: line.lineTotal,
      })),
    );

    await tx.insert(orderStatusHistory).values({
      id: newId("osh"),
      orderId,
      fromStatus: null,
      toStatus: isCod ? "confirmed" : "pending_payment",
      note: isCod ? "Cash on delivery order placed." : "Awaiting payment.",
      actor: "customer",
      actorUid: input.userId,
    });

    await tx.delete(cartItems).where(eq(cartItems.cartId, cart.id));
    await upsertAddress(tx, input.userId, address, Boolean(input.saveAddress));

    await tx.insert(payments).values({
      id: newId("pay"),
      orderId,
      provider: input.paymentMethod,
      amount: total,
      currency: lines[0]!.currency,
      status: isCod ? "cod_pending" : "pending",
      method: input.paymentMethod,
      meta: { orderNumber },
    });

    return {
      orderId,
      orderNumber,
      total,
      currency: lines[0]!.currency,
      paymentMethod: input.paymentMethod,
    } satisfies PlaceOrderResult;
  });
}

async function upsertAddress(
  tx: Db,
  userId: string,
  address: ReturnType<typeof normalizeAddress>,
  save: boolean,
): Promise<void> {
  if (!save) return;
  const [existing] = await tx
    .select({ id: userAddresses.id })
    .from(userAddresses)
    .where(and(eq(userAddresses.userId, userId), eq(userAddresses.label, address.label)))
    .limit(1);
  if (existing) {
    await tx
      .update(userAddresses)
      .set({ ...address, updatedAt: new Date() })
      .where(eq(userAddresses.id, existing.id));
    return;
  }
  const count = await tx
    .select({ n: sql<number>`count(*)::int` })
    .from(userAddresses)
    .where(eq(userAddresses.userId, userId));
  await tx.insert(userAddresses).values({
    id: newId("adr"),
    userId,
    ...address,
    isDefaultShipping: (count[0]?.n ?? 0) === 0,
  });
}

export async function writeOrderAudit(entry: {
  orderId: string;
  orderNumber: string;
  uid: string;
  email: string;
  summary: string;
  ip?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  await writeAudit(
    {
      action: "order.create",
      actorUid: entry.uid,
      actorEmail: entry.email,
      targetType: "order",
      targetId: entry.orderId,
      summary: entry.summary,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
    },
    db,
  );
}
