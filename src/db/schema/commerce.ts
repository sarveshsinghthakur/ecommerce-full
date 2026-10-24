import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { products, productVariants } from "./catalog";
import { users } from "./auth";

export const orderStatusEnum = pgEnum("order_status", [
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
  "refunded",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
  "cod_pending",
]);

export const reviewStatusEnum = pgEnum("review_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * One cart per authenticated user (userId set) or one anonymous cart per
 * browser session (sessionId set). Exactly one of the two is populated.
 * Anonymous carts are merged into the user cart after sign-in.
 */
export const carts = pgTable(
  "carts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    sessionId: text("session_id"),
    mergedIntoId: text("merged_into_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("carts_user_key").on(t.userId),
    uniqueIndex("carts_session_key").on(t.sessionId),
  ],
);

export const cartItems = pgTable(
  "cart_items",
  {
    id: text("id").primaryKey(),
    cartId: text("cart_id")
      .notNull()
      .references(() => carts.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: text("variant_id").references(() => productVariants.id, {
      onDelete: "set null",
    }),
    quantity: integer("quantity").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("cart_items_cart_idx").on(t.cartId),
    // Products without variants store a NULL variant id, so uniqueness is
    // expressed over `coalesce(variant_id, '')` rather than the raw column.
    uniqueIndex("cart_items_unique").on(
      t.cartId,
      t.productId,
      sql`coalesce(${t.variantId}, '')`,
    ),
  ],
);

export const wishlists = pgTable(
  "wishlists",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("wishlists_user_key").on(t.userId)],
);

export const wishlistItems = pgTable(
  "wishlist_items",
  {
    id: text("id").primaryKey(),
    wishlistId: text("wishlist_id")
      .notNull()
      .references(() => wishlists.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("wishlist_items_wishlist_idx").on(t.wishlistId),
    uniqueIndex("wishlist_items_unique").on(t.wishlistId, t.productId),
  ],
);

/**
 * Orders carry denormalized snapshots of every purchased line so that later
 * product edits, price changes or deletions can never rewrite history.
 */
export const orders = pgTable(
  "orders",
  {
    id: text("id").primaryKey(),
    orderNumber: text("order_number").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),

    // Contact snapshot at time of purchase.
    email: text("email").notNull(),
    fullName: text("full_name").notNull(),
    phone: text("phone").notNull(),

    addressId: text("address_id"),
    shippingAddress: jsonb("shipping_address").notNull(),

    status: orderStatusEnum("status").notNull().default("pending_payment"),
    paymentStatus: paymentStatusEnum("payment_status")
      .notNull()
      .default("pending"),
    paymentProvider: text("payment_provider"),

    currency: text("currency").notNull().default("INR"),
    subtotal: numeric("subtotal", { precision: 12, scale: 2 }).notNull(),
    shippingAmount: numeric("shipping_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    discountAmount: numeric("discount_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    total: numeric("total", { precision: 12, scale: 2 }).notNull(),
    couponCode: text("coupon_code"),

    notes: text("notes"),
    /** Guards against duplicate order creation from repeated submissions. */
    idempotencyKey: text("idempotency_key"),
    placedAt: timestamp("placed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("orders_number_key").on(t.orderNumber),
    uniqueIndex("orders_idempotency_key")
      .on(t.userId, t.idempotencyKey)
      .where(sql`${t.idempotencyKey} is not null`),
    index("orders_user_idx").on(t.userId, t.placedAt),
    index("orders_status_idx").on(t.status),
    index("orders_payment_status_idx").on(t.paymentStatus),
  ],
);

export const orderItems = pgTable(
  "order_items",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    productId: text("product_id"),
    variantId: text("variant_id"),
    productSlug: text("product_slug").notNull(),
    title: text("title").notNull(),
    variantName: text("variant_name"),
    sku: text("sku"),
    imageUrl: text("image_url"),
    sourceUrl: text("source_url"),
    sourceProvider: text("source_provider"),

    quantity: integer("quantity").notNull(),
    // Purchase-time pricing snapshots.
    unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2 }),
    taxAmount: numeric("tax_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    lineTotal: numeric("line_total", { precision: 12, scale: 2 }).notNull(),

    /** Manual sourcing/fulfilment workflow for imported marketplace goods. */
    sourcingStatus: text("sourcing_status").notNull().default("not_started"),
    sourcingNote: text("sourcing_note"),
    orderedFromProviderAt: timestamp("ordered_from_provider_at", {
      withTimezone: true,
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("order_items_order_idx").on(t.orderId),
    uniqueIndex("order_items_unique").on(
      t.orderId,
      t.productId,
      sql`coalesce(${t.variantId}, '')`,
    ),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    providerOrderId: text("provider_order_id"),
    providerPaymentId: text("provider_payment_id"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("INR"),
    status: paymentStatusEnum("status").notNull().default("pending"),
    method: text("method"),
    /** Verified payload summary only — never raw card/CVV data. */
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("payments_order_idx").on(t.orderId),
    // Idempotency key for webhook replay: the same provider order id can only
    // ever create a single payment row.
    uniqueIndex("payments_provider_order_key")
      .on(t.provider, t.providerOrderId)
      .where(sql`${t.providerOrderId} is not null`),
  ],
);

export const orderStatusHistory = pgTable(
  "order_status_history",
  {
    id: text("id").primaryKey(),
    orderId: text("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    fromStatus: text("from_status"),
    toStatus: text("to_status").notNull(),
    note: text("note"),
    actor: text("actor").notNull().default("system"),
    actorUid: text("actor_uid"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("order_status_history_order_idx").on(t.orderId, t.createdAt)],
);

export const coupons = pgTable(
  "coupons",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    description: text("description"),
    type: text("type").notNull().default("percent"),
    value: numeric("value", { precision: 12, scale: 2 }).notNull(),
    minOrderAmount: numeric("min_order_amount", { precision: 12, scale: 2 })
      .notNull()
      .default("0"),
    maxUses: integer("max_uses"),
    usedCount: integer("used_count").notNull().default(0),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("coupons_code_key").on(t.code)],
);

export const customerReviews = pgTable(
  "customer_reviews",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    orderId: text("order_id").references(() => orders.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    title: text("title"),
    body: text("body").notNull(),
    status: reviewStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("customer_reviews_unique").on(t.productId, t.userId),
    index("customer_reviews_product_idx").on(t.productId, t.status),
  ],
);
