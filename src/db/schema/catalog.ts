import { sql } from "drizzle-orm";
import {
  boolean,
  customType,
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

/** `tsvector` is not shipped as a first-class drizzle type; map it explicitly. */
export const tsvector = customType<{ data: string; driverData: string }>({
  dataType: () => "tsvector",
});

export const productStatusEnum = pgEnum("product_status", [
  "draft",
  "needs_review",
  "published",
  "unpublished",
]);

export const availabilityEnum = pgEnum("availability", [
  "in_stock",
  "out_of_stock",
  "preorder",
  "unknown",
]);

export const importJobStatusEnum = pgEnum("import_job_status", [
  "pending",
  "running",
  "succeeded",
  "partial",
  "failed",
]);

export const priceHistoryReasonEnum = pgEnum("price_history_reason", [
  "initial_import",
  "source_reprice",
  "markup_change",
  "manual_override",
  "admin_edit",
]);

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey(),
    parentId: text("parent_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    imageUrl: text("image_url"),
    position: integer("position").notNull().default(0),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("categories_slug_key").on(t.slug),
    index("categories_parent_idx").on(t.parentId),
  ],
);

/**
 * Canonical internal product template. Every marketplace adapter normalizes
 * into exactly this shape, and every column that was not verifiably present in
 * the source payload stays NULL rather than being invented.
 */
export const products = pgTable(
  "products",
  {
    id: text("id").primaryKey(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    brand: text("brand"),
    description: text("description"),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),

    // --- pricing (always three distinct, separately stored values) ----------
    currency: text("currency").notNull().default("INR"),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2 }),
    calculatedSellingPrice: numeric("calculated_selling_price", {
      precision: 12,
      scale: 2,
    }),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
    priceOverride: boolean("price_override").notNull().default(false),
    /** Only populated when the source genuinely published a reference/MRP. */
    referencePrice: numeric("reference_price", { precision: 12, scale: 2 }),
    priceVerifiedAt: timestamp("price_verified_at", { withTimezone: true }),

    status: productStatusEnum("status").notNull().default("draft"),
    rating: numeric("rating", { precision: 3, scale: 2 }),
    reviewCount: integer("review_count").notNull().default(0),
    stockQuantity: integer("stock_quantity"),
    availability: availabilityEnum("availability").notNull().default("unknown"),
    searchKeywords: text("search_keywords"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),

    // Full-text search vector maintained by Postgres (english config).
    searchVector: tsvector("search_vector").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, coalesce(title,'') || ' ' || coalesce(brand,'') || ' ' || coalesce(slug,'') || ' ' || coalesce(search_keywords,'') || ' ' || coalesce(description,''))`,
    ),

    importCount: integer("import_count").notNull().default(0),
    lastImportedAt: timestamp("last_imported_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [
    uniqueIndex("products_slug_key").on(t.slug),
    index("products_category_idx").on(t.categoryId),
    index("products_status_idx").on(t.status),
    index("products_created_at_idx").on(t.createdAt),
    index("products_selling_price_idx").on(t.sellingPrice),
    index("products_brand_idx").on(t.brand),
    index("products_search_idx").using("gin", t.searchVector),
    // Trigram index powers typo-tolerant / partial-word matching.
    index("products_title_trgm_idx").using(
      "gin",
      sql`(title || ' ' || coalesce(brand, '')) gin_trgm_ops`,
    ),
    index("products_desc_trgm_idx").using(
      "gin",
      sql`coalesce(description, '') gin_trgm_ops`,
    ),
  ],
);

export const productImages = pgTable(
  "product_images",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    alt: text("alt"),
    position: integer("position").notNull().default(0),
    source: text("source").notNull().default("imported"),
    width: integer("width"),
    height: integer("height"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("product_images_product_idx").on(t.productId, t.position)],
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sku: text("sku"),
    name: text("name").notNull(),
    options: jsonb("options").notNull().default(sql`'{}'::jsonb`),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
    stockQuantity: integer("stock_quantity"),
    availability: availabilityEnum("availability").notNull().default("unknown"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("product_variants_product_idx").on(t.productId),
    uniqueIndex("product_variants_sku_key").on(t.productId, t.sku),
  ],
);

export const productAttributes = pgTable(
  "product_attributes",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    value: text("value").notNull(),
    position: integer("position").notNull().default(0),
  },
  (t) => [
    index("product_attributes_product_idx").on(t.productId),
    uniqueIndex("product_attributes_unique").on(t.productId, t.key),
  ],
);

/**
 * One row per successfully parsed external listing. Serves as the duplicate
 * detection key and as the preserved source snapshot for auditing.
 */
export const sourceListings = pgTable(
  "source_listings",
  {
    id: text("id").primaryKey(),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    provider: text("provider").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceUrlNormalized: text("source_url_normalized").notNull(),
    sourceProductId: text("source_product_id"),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    sourceCurrency: text("source_currency"),
    sourceRating: numeric("source_rating", { precision: 3, scale: 2 }),
    sourceReviewCount: integer("source_review_count"),
    sourceAvailability: text("source_availability"),
    /** Raw payload is retained only when the provider permits it. */
    rawPayload: jsonb("raw_payload"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("source_listings_url_key").on(t.sourceUrlNormalized),
    index("source_listings_product_idx").on(t.productId),
    uniqueIndex("source_listings_provider_external_key")
      .on(t.provider, t.sourceProductId)
      .where(sql`${t.sourceProductId} is not null`),
  ],
);

export const productPriceHistory = pgTable(
  "product_price_history",
  {
    id: text("id").primaryKey(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sourcePrice: numeric("source_price", { precision: 12, scale: 2 }),
    markupPercent: numeric("markup_percent", { precision: 6, scale: 2 }),
    calculatedSellingPrice: numeric("calculated_selling_price", {
      precision: 12,
      scale: 2,
    }),
    sellingPrice: numeric("selling_price", { precision: 12, scale: 2 }),
    currency: text("currency").notNull().default("INR"),
    reason: priceHistoryReasonEnum("reason").notNull(),
    actorUid: text("actor_uid"),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("product_price_history_product_idx").on(t.productId, t.createdAt)],
);

export const productImportJobs = pgTable(
  "product_import_jobs",
  {
    id: text("id").primaryKey(),
    url: text("url").notNull(),
    provider: text("provider"),
    status: importJobStatusEnum("status").notNull().default("pending"),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    sourceListingId: text("source_listing_id"),
    preview: jsonb("preview"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    warnings: jsonb("warnings").notNull().default(sql`'[]'::jsonb`),
    missingFields: jsonb("missing_fields").notNull().default(sql`'[]'::jsonb`),
    durationMs: integer("duration_ms"),
    actorUid: text("actor_uid").notNull(),
    actorEmail: text("actor_email"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
  },
  (t) => [
    index("product_import_jobs_created_idx").on(t.createdAt),
    index("product_import_jobs_status_idx").on(t.status),
  ],
);
