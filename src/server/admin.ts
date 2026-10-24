import "server-only";

import { and, count, desc, eq, ilike, inArray, ne, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { orderStatusEnum, orders, products, users } from "@/db/schema";
import { productStatusEnum } from "@/db/schema/catalog";
import { listRecentAudit, parseAuditMetadata } from "@/lib/audit";

/**
 * Read model for the admin area. Admin queries intentionally ignore the
 * "published-only" scope of the storefront: draft and unpublished rows must be
 * visible here, but they can never leak through `src/server/catalog.ts`.
 */

export interface AdminProduct {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  categorySlug: string | null;
  status: string;
  availability: string;
  sellingPrice: string;
  referencePrice: string | null;
  currency: string;
  stockQuantity: number | null;
  rating: string | null;
  reviewCount: number;
  publishedAt: Date | null;
  createdAt: Date;
}

export interface AdminOrder {
  id: string;
  orderNumber: string;
  placedAt: Date;
  email: string;
  fullName: string;
  status: string;
  paymentStatus: string;
  itemCount: number;
  firstItemTitle: string | null;
  total: string;
  currency: string;
}

export interface AdminOverview {
  products: {
    total: number;
    published: number;
    draft: number;
    needsReview: number;
    unpublished: number;
  };
  userCount: number;
  orders: {
    total: number;
    open: number;
    awaitingPayment: number;
    delivered: number;
    problem: number;
  };
  /** Sum of order totals that were actually paid and not refunded. */
  paidRevenue: string;
  currency: string;
  lowStock: Array<{
    id: string;
    slug: string;
    title: string;
    imageUrl: string | null;
    stockQuantity: number | null;
    availability: string;
  }>;
  recentOrders: AdminOrder[];
  recentActivity: Array<{
    id: string;
    action: string;
    actorEmail: string | null;
    summary: string | null;
    createdAt: Date;
  }>;
}

const LOW_STOCK_THRESHOLD = 5;

/** Same correlated first-image lookup as the storefront card renderer. */
const imageSelect = sql<string | null>`(
  select pi.url from product_images pi
  where pi.product_id = products.id
  order by pi.position asc
  limit 1
)`;

const itemCountSelect = sql<number>`(
  select coalesce(sum(oi.quantity), 0)::int from order_items oi
  where oi.order_id = orders.id
)`;

const firstItemSelect = sql<string | null>`(
  select oi.title from order_items oi
  where oi.order_id = orders.id
  order by oi.line_total desc
  limit 1
)`;

const orderColumns = {
  id: orders.id,
  orderNumber: orders.orderNumber,
  placedAt: orders.placedAt,
  email: orders.email,
  fullName: orders.fullName,
  status: orders.status,
  paymentStatus: orders.paymentStatus,
  itemCount: itemCountSelect,
  firstItemTitle: firstItemSelect,
  total: orders.total,
  currency: orders.currency,
};

export async function adminOverview(): Promise<AdminOverview> {
  const paidEnough = and(
    eq(orders.paymentStatus, "paid"),
    ne(orders.status, "cancelled"),
    ne(orders.status, "refunded"),
  );

  const [[productCounts], [userCount], [orderCounts], [revenue]] = await Promise.all([
    db
      .select({
        total: count(),
        published: sql<number>`count(*) filter (where "products"."status" = 'published')::int`,
        draft: sql<number>`count(*) filter (where "products"."status" = 'draft')::int`,
        needsReview: sql<number>`count(*) filter (where "products"."status" = 'needs_review')::int`,
        unpublished: sql<number>`count(*) filter (where "products"."status" = 'unpublished')::int`,
      })
      .from(products),
    db.select({ total: count() }).from(users),
    db
      .select({
        total: count(),
        awaitingPayment: sql<number>`count(*) filter (where "orders"."payment_status" = 'pending'
          or "orders"."status" = 'pending_payment')::int`,
        delivered: sql<number>`count(*) filter (where "orders"."status" = 'delivered')::int`,
        problem: sql<number>`count(*) filter (where "orders"."status" in ('cancelled', 'payment_failed', 'refunded'))::int`,
        open: sql<number>`count(*) filter (where "orders"."status" in ('confirmed', 'processing', 'shipped'))::int`,
      })
      .from(orders),
    db
      .select({
        sum: sql<string | null>`coalesce(sum(${orders.total}), null)::text`,
        currency: sql<string | null>`min(${orders.currency})`,
      })
      .from(orders)
      .where(paidEnough ?? eq(orders.paymentStatus, "paid")),
  ]);

  const lowStock = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      imageUrl: imageSelect,
      stockQuantity: products.stockQuantity,
      availability: products.availability,
    })
    .from(products)
    .where(
      and(
        inArray(products.status, ["published", "draft", "needs_review"]),
        or(
          sql`${products.stockQuantity} <= ${LOW_STOCK_THRESHOLD}`,
          eq(products.availability, "out_of_stock"),
        ),
      ),
    )
    .orderBy(products.stockQuantity)
    .limit(6);

  const recentOrders = await db
    .select(orderColumns)
    .from(orders)
    .orderBy(desc(orders.placedAt))
    .limit(8);

  const auditRows = await listRecentAudit(db, 12);
  const recentActivity = auditRows.map((row) => ({
    id: row.id,
    action: row.action,
    actorEmail: row.actorEmail ?? null,
    summary: parseAuditMetadata(row.metadata).summary ?? null,
    createdAt: row.createdAt,
  }));

  return {
    products: {
      total: Number(productCounts?.total ?? 0),
      published: productCounts?.published ?? 0,
      draft: productCounts?.draft ?? 0,
      needsReview: productCounts?.needsReview ?? 0,
      unpublished: productCounts?.unpublished ?? 0,
    },
    userCount: Number(userCount?.total ?? 0),
    orders: {
      total: Number(orderCounts?.total ?? 0),
      open: orderCounts?.open ?? 0,
      awaitingPayment: orderCounts?.awaitingPayment ?? 0,
      delivered: orderCounts?.delivered ?? 0,
      problem: orderCounts?.problem ?? 0,
    },
    paidRevenue: revenue?.sum ?? "0.00",
    currency: revenue?.currency ?? "INR",
    lowStock: lowStock.map((row) => ({
      ...row,
      imageUrl: row.imageUrl ?? null,
    })),
    recentOrders: recentOrders.map((row) => ({
      ...row,
      itemCount: Number(row.itemCount ?? 0),
    })),
    recentActivity,
  };
}

export interface ProductWhereOps { }
type ProductStatus = (typeof productStatusEnum.enumValues)[number];
type OrderStatus = (typeof orderStatusEnum.enumValues)[number];

export interface AdminProductFilters {
  status?: ProductStatus | null;
  q?: string | null;
  page?: number;
}

export interface AdminPageResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function productConditions(f: AdminProductFilters): SQL[] {
  const conditions: SQL[] = [];
  if (f.status) conditions.push(eq(products.status, f.status));
  if (f.q) {
    const pattern = `%${f.q.trim()}%`;
    conditions.push(
      or(ilike(products.title, pattern), ilike(products.brand, pattern))!,
    );
  }
  return conditions;
}

export async function adminListProducts(
  filters: AdminProductFilters = {},
): Promise<AdminPageResult<AdminProduct>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const conditions = productConditions(filters);

  const [[countRow], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined),
    db
      .select({
        id: products.id,
        slug: products.slug,
        title: products.title,
        brand: products.brand,
        imageUrl: imageSelect,
        categorySlug: sql<string | null>`(
          select c.slug from categories c where c.id = ${products.categoryId}
        )`,
        status: products.status,
        availability: products.availability,
        sellingPrice: products.sellingPrice,
        referencePrice: products.referencePrice,
        currency: products.currency,
        stockQuantity: products.stockQuantity,
        rating: products.rating,
        reviewCount: products.reviewCount,
        publishedAt: products.publishedAt,
        createdAt: products.createdAt,
      })
      .from(products)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = Number(countRow?.total ?? 0);
  return {
    items: rows as AdminProduct[],
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface AdminOrderFilters {
  status?: OrderStatus | null;
  paymentStatus?: string | null;
  page?: number;
}

export async function adminListOrders(
  filters: AdminOrderFilters = {},
): Promise<AdminPageResult<AdminOrder>> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = 20;
  const conditions: SQL[] = [];
  if (filters.status) conditions.push(eq(orders.status, filters.status));
  if (filters.paymentStatus) {
    conditions.push(sql`${orders.paymentStatus} = ${filters.paymentStatus}`);
  }

  const [[countRow], rows] = await Promise.all([
    db
      .select({ total: count() })
      .from(orders)
      .where(conditions.length ? and(...conditions) : undefined),
    db
      .select(orderColumns)
      .from(orders)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(orders.placedAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
  ]);

  const total = Number(countRow?.total ?? 0);
  return {
    items: rows.map((row) => ({ ...row, itemCount: Number(row.itemCount ?? 0) })),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Public product statuses for the admin filter tabs (order = enum order). */
export const PRODUCT_STATUSES = [
  "all",
  "published",
  "draft",
  "needs_review",
  "unpublished",
] as const;

export const ORDER_STATUSES = [
  "all",
  "pending_payment",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
  "payment_failed",
  "refunded",
] as const;

export const PRODUCT_STATUS_LABELS: Record<string, string> = {
  all: "All",
  published: "Published",
  draft: "Draft",
  needs_review: "Needs review",
  unpublished: "Unpublished",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  all: "All",
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};
