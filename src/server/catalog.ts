import "server-only";

import {
  and,
  desc,
  eq,
  gte,
  inArray,
  isNotNull,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "@/db";
import { categories, productImages, products } from "@/db/schema";

/**
 * Read model for the storefront. Every query here is scoped to published
 * products — draft, needs-review, and unpublished rows never leave the admin
 * area through this module.
 */

export type SortKey =
  | "discount"
  | "newest"
  | "price_asc"
  | "price_desc"
  | "rating";

export interface ProductCard {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  sellingPrice: string;
  referencePrice: string | null;
  currency: string;
  rating: string | null;
  reviewCount: number;
  availability: string;
  categoryId: string | null;
  categorySlug: string | null;
  /** Populated only when the catalog source explicitly flags the item. */
  isBestseller?: boolean;
}

/** Raw shape selected by `cardColumns`; mirrors {@link ProductCard} with nullable prices. */
interface CardRow {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
  sellingPrice: string | null;
  referencePrice: string | null;
  currency: string;
  rating: string | null;
  reviewCount: number;
  availability: string;
  categoryId: string | null;
  categorySlug: string | null;
}

export interface ProductFilters {
  categoryId?: string | null;
  brand?: string | null;
  minPrice?: string | null;
  maxPrice?: string | null;
  /** Minimum customer rating (0–5). Filters out products rated below it. */
  minRating?: string | null;
  /** When true, hides products whose availability is `out_of_stock`. */
  inStockOnly?: boolean;
  /** When true, keeps only products genuinely discounted off a reference price. */
  dealsOnly?: boolean;
  sort?: SortKey;
  page?: number;
  pageSize?: number;
  includeUnpublished?: boolean;
}

// The sub-query must reference products.id literally. Interpolating the
// drizzle column renders a bare "id", which inside this fragment resolves
// against product_images (its own "id" column shadows the outer scope) and
// returns NULL for every row.
const imageSelect = sql<string | null>`(
  select pi.url from product_images pi
  where pi.product_id = products.id
  order by pi.position asc, pi.id asc
  limit 1
)`;

const categorySlugSelect = sql<string | null>`(
  select c.slug from categories c where c.id = products.category_id
)`;

const cardColumns = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  brand: products.brand,
  imageUrl: imageSelect,
  sellingPrice: products.sellingPrice,
  referencePrice: products.referencePrice,
  currency: products.currency,
  rating: products.rating,
  reviewCount: products.reviewCount,
  availability: products.availability,
  categoryId: products.categoryId,
  categorySlug: categorySlugSelect,
};

function publishedConditions(filters: ProductFilters): SQL[] {
  const conditions: SQL[] = [];
  if (!filters.includeUnpublished) {
    conditions.push(eq(products.status, "published"));
  }
  if (filters.categoryId) conditions.push(eq(products.categoryId, filters.categoryId));
  if (filters.brand) conditions.push(eq(products.brand, filters.brand));
  if (filters.minPrice) conditions.push(gte(products.sellingPrice, filters.minPrice));
  if (filters.maxPrice) conditions.push(lte(products.sellingPrice, filters.maxPrice));
  // Rating is stored as numeric(3,2) and is nullable; unrated products are
  // excluded whenever a minimum rating is requested.
  if (filters.minRating) {
    conditions.push(sql`${products.rating} >= ${Number(filters.minRating)}`);
  }
  if (filters.inStockOnly) {
    conditions.push(sql`${products.availability} <> 'out_of_stock'`);
  }
  if (filters.dealsOnly) {
    // `reference_price > selling_price` also excludes rows where the
    // reference price is NULL (comparison yields NULL, not true).
    conditions.push(sql`${products.referencePrice} > ${products.sellingPrice}`);
  }
  return conditions;
}

function orderClause(sort: SortKey | undefined): SQL[] {
  switch (sort) {
    case "price_asc":
      return [sql`${products.sellingPrice} asc nulls last`, desc(products.createdAt)];
    case "price_desc":
      return [sql`${products.sellingPrice} desc nulls last`, desc(products.createdAt)];
    case "rating":
      return [desc(products.rating), desc(products.reviewCount)];
    case "newest":
      return [desc(products.createdAt)];
    case "discount":
      // Discount fraction: (reference − selling) / reference. Rows without a
      // genuine reference price sort last rather than being treated as 100% off.
      return [
        sql`case
              when ${products.referencePrice} is not null
               and ${products.referencePrice} > 0
               and ${products.referencePrice} > ${products.sellingPrice}
              then (${products.referencePrice} - ${products.sellingPrice}) / ${products.referencePrice}
              else 0
            end desc`,
        desc(products.rating),
        desc(products.reviewCount),
      ];
    default:
      return [desc(products.publishedAt), desc(products.createdAt)];
  }
}

export interface ProductPage {
  items: ProductCard[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductPage> {
  const page = Math.max(1, filters.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, filters.pageSize ?? 24));
  const where = publishedConditions(filters);
  const whereSql = where.length ? and(...where) : undefined;

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(whereSql);

  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(whereSql)
    .orderBy(...orderClause(filters.sort))
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const total = countRow?.n ?? 0;
  return {
    items: rows.map(toCard),
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listFeaturedProducts(limit = 8): Promise<ProductCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.rating), desc(products.reviewCount), desc(products.publishedAt))
    .limit(limit);
  return rows.map(toCard);
}

export async function listLatestProducts(limit = 8): Promise<ProductCard[]> {
  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(eq(products.status, "published"))
    .orderBy(desc(products.publishedAt), desc(products.createdAt))
    .limit(limit);
  return rows.map(toCard);
}

export interface DealProduct extends ProductCard {
  stockQuantity: number | null;
}

/**
 * Biggest genuine discounts first (products whose selling price is below a
 * real reference price). Powers the homepage Flash Deals row and its
 * "View all deals" count.
 */
export async function listDealProducts(limit = 4): Promise<{
  items: DealProduct[];
  total: number;
}> {
  const where = and(
    eq(products.status, "published"),
    sql`${products.referencePrice} > ${products.sellingPrice}`,
  );

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(where);

  const rows = await db
    .select({ ...cardColumns, stockQuantity: products.stockQuantity })
    .from(products)
    .where(where)
    .orderBy(
      sql`(${products.referencePrice} - ${products.sellingPrice}) / ${products.referencePrice} desc`,
      desc(products.rating),
    )
    .limit(Math.min(24, Math.max(1, limit)));

  return {
    items: rows.map((row) => ({ ...toCard(row), stockQuantity: row.stockQuantity })),
    total: countRow?.n ?? 0,
  };
}

/**
 * Up to `limit` products under `maxPrice` (or at/above it when `minPrice` is
 * given), best rated first. Powers the homepage "Shop by price" tiers.
 */
export async function listProductsByPriceBand(opts: {
  minPrice?: string;
  maxPrice?: string;
  limit?: number;
}): Promise<ProductCard[]> {
  const page = await listProducts({
    minPrice: opts.minPrice ?? null,
    maxPrice: opts.maxPrice ?? null,
    sort: "rating",
    page: 1,
    pageSize: opts.limit ?? 4,
  });
  return page.items;
}

export interface CategoryCard {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
}

export async function listCategories(activeOnly = true): Promise<CategoryCard[]> {
  const rows = await db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      description: categories.description,
      imageUrl: categories.imageUrl,
      isActive: categories.isActive,
      productCount: sql<number>`(
        select count(*)::int from products p
        where p.category_id = categories.id and p.status = 'published'
      )`,
    })
    .from(categories)
    .orderBy(categories.position, categories.name);

  return rows
    .filter((row) => (activeOnly ? row.isActive : true))
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      description: row.description,
      imageUrl: row.imageUrl,
      productCount: row.productCount,
    }));
}

export async function getCategoryBySlug(
  slug: string,
): Promise<typeof categories.$inferSelect | null> {
  const [row] = await db
    .select()
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  return row ?? null;
}

export interface ProductDetail extends ProductCard {
  description: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  stockQuantity: number | null;
  sourcePrice: string | null;
  markupPercent: string | null;
  publishedAt: Date | null;
  category: { id: string; name: string; slug: string } | null;
  images: { id: string; url: string; alt: string | null; position: number }[];
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  const [row] = await db
    .select({
      ...cardColumns,
      description: products.description,
      seoTitle: products.seoTitle,
      seoDescription: products.seoDescription,
      stockQuantity: products.stockQuantity,
      sourcePrice: products.sourcePrice,
      markupPercent: products.markupPercent,
      publishedAt: products.publishedAt,
      status: products.status,
    })
    .from(products)
    .where(eq(products.slug, slug))
    .limit(1);

  if (!row || row.status !== "published") return null;

  const detail: ProductDetail = {
    ...toCard(row),
    description: row.description,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    stockQuantity: row.stockQuantity,
    sourcePrice: row.sourcePrice,
    markupPercent: row.markupPercent,
    publishedAt: row.publishedAt,
    category: null,
    images: [],
  };

  if (row.categoryId) {
    const [cat] = await db
      .select({ id: categories.id, name: categories.name, slug: categories.slug })
      .from(categories)
      .where(eq(categories.id, row.categoryId))
      .limit(1);
    detail.category = cat ?? null;
  }

  const images = await db
    .select()
    .from(productImages)
    .where(eq(productImages.productId, row.id))
    .orderBy(productImages.position, productImages.id);
  detail.images = images.map((img) => ({
    id: img.id,
    url: img.url,
    alt: img.alt ?? null,
    position: img.position,
  }));

  return detail;
}

export async function getRelatedProducts(
  product: ProductDetail,
  limit = 4,
): Promise<ProductCard[]> {
  const seen = new Set<string>();
  const results: ProductCard[] = [];

  if (product.categoryId) {
    const siblings = await db
      .select(cardColumns)
      .from(products)
      .where(
        and(
          eq(products.status, "published"),
          eq(products.categoryId, product.categoryId),
          sql`${products.id} <> ${product.id}`,
        ),
      )
      .orderBy(desc(products.rating), desc(products.reviewCount))
      .limit(limit);
    for (const row of siblings) {
      if (results.length >= limit) break;
      seen.add(row.id);
      results.push(toCard(row));
    }
  }

  if (results.length < limit) {
    const fill = await db
      .select(cardColumns)
      .from(products)
      .where(
        and(
          eq(products.status, "published"),
          sql`${products.id} <> ${product.id}`,
        ),
      )
      .orderBy(desc(products.rating), desc(products.reviewCount))
      .limit(limit - results.length);
    for (const row of fill) {
      if (seen.has(row.id)) continue;
      results.push(toCard(row));
      if (results.length >= limit) break;
    }
  }

  return results;
}

export async function listBrands(): Promise<string[]> {
  const rows = await db
    .selectDistinct({ brand: products.brand })
    .from(products)
    .where(and(eq(products.status, "published"), isNotNull(products.brand)))
    .orderBy(products.brand);
  return rows.map((r) => r.brand).filter((b): b is string => Boolean(b));
}

export interface BrandFacet {
  brand: string;
  count: number;
}

/** Distinct published brands (with product counts) for a category facet. */
export async function listBrandFacets(categoryId?: string | null): Promise<BrandFacet[]> {
  const conditions: SQL[] = [eq(products.status, "published"), isNotNull(products.brand)];
  if (categoryId) conditions.push(eq(products.categoryId, categoryId));

  const rows = await db
    .select({ brand: products.brand, n: sql<number>`count(*)::int` })
    .from(products)
    .where(and(...conditions))
    .groupBy(products.brand)
    .orderBy(desc(sql`count(*)`), products.brand);

  return rows
    .filter((r): r is { brand: string; n: number } => Boolean(r.brand))
    .map((r) => ({ brand: r.brand, count: r.n }));
}

/* ----------------------------- full-text search ---------------------------- */

export interface SearchResult {
  items: ProductCard[];
  total: number;
  matched: boolean;
}

function escapeLike(value: string): string {
  return value.replace(/[%_\\]/g, (m) => `\\${m}`);
}

/**
 * Hybrid search: Postgres full-text for relevance plus prefix matching for
 * partial words and brand tokens. Both the GIN tsvector index and the trigram
 * indexes already exist on `products`.
 */
export async function searchProducts(
  query: string,
  opts: { limit?: number; offset?: number } = {},
): Promise<SearchResult> {
  const term = query.trim().slice(0, 120);
  if (!term) return { items: [], total: 0, matched: false };

  const limit = Math.min(100, Math.max(1, opts.limit ?? 24));
  const offset = Math.max(0, opts.offset ?? 0);
  const pattern = `%${escapeLike(term.toLowerCase())}%`;

  const fts = sql`websearch_to_tsquery('english', ${term})`;
  const haystack = sql`lower(${products.title} || ' ' || coalesce(${products.brand}, '') || ' ' || coalesce(${products.description}, ''))`;
  const scope = and(
    eq(products.status, "published"),
    or(sql`${products.searchVector} @@ ${fts}`, sql`${haystack} like ${pattern}`),
  );

  const [countRow] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(products)
    .where(scope);

  // Relevance score. Drizzle does not emit an output alias for raw SQL select
  // values, so the same fragment is reused in ORDER BY instead of referencing
  // a `rank` alias (Postgres would fail to resolve it).
  const rankExpr = sql<number>`(
        (case when ${products.searchVector} @@ ${fts}
              then ts_rank(${products.searchVector}, ${fts}) else 0 end)
        + (case when ${haystack} like ${pattern} then 0.35 else 0 end)
        + (case when lower(${products.title}) like ${pattern} then 0.25 else 0 end)
      )`;

  const rows = await db
    .select({
      ...cardColumns,
      rank: rankExpr,
    })
    .from(products)
    .where(scope)
    .orderBy(sql`${rankExpr} desc`, desc(products.rating), desc(products.createdAt))
    .limit(limit)
    .offset(offset);

  const total = countRow?.n ?? 0;
  return { items: rows.map(toCard), total, matched: total > 0 };
}

/** Autocomplete suggestions for the header search box. */
export async function suggestProducts(term: string, limit = 6): Promise<ProductCard[]> {
  const trimmed = term.trim().slice(0, 80);
  if (trimmed.length < 2) return [];
  const pattern = `%${escapeLike(trimmed.toLowerCase())}%`;
  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(
      and(
        eq(products.status, "published"),
        sql`lower(${products.title} || ' ' || coalesce(${products.brand}, '')) like ${pattern}`,
      ),
    )
    .orderBy(desc(products.rating), desc(products.reviewCount))
    .limit(limit);
  return rows.map(toCard);
}

/**
 * Resolves a wishlist of stored product ids back into catalogue rows.
 *
 * Used by the wishlist page: ids live in the browser, so the page posts them
 * here to render real cards. Published products only, and only the ids that
 * still exist — a saved item that was unpublished simply drops out.
 */
export async function getProductsByIds(
  ids: string[],
  limit = 60,
): Promise<ProductCard[]> {
  const unique = Array.from(
    new Set(ids.map((id) => id.trim()).filter(Boolean)),
  ).slice(0, limit);
  if (unique.length === 0) return [];

  const rows = await db
    .select(cardColumns)
    .from(products)
    .where(and(eq(products.status, "published"), inArray(products.id, unique)))
    .orderBy(desc(products.rating), desc(products.reviewCount))
    .limit(limit);

  const byId = new Map(rows.map((row) => [row.id, toCard(row)]));
  // Preserve the shopper's own ordering rather than the query's.
  return unique
    .map((id) => byId.get(id))
    .filter((row): row is ProductCard => Boolean(row));
}

function toCard(row: CardRow): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    imageUrl: row.imageUrl,
    sellingPrice: row.sellingPrice ?? "0.00",
    referencePrice: row.referencePrice,
    currency: row.currency,
    rating: row.rating,
    reviewCount: row.reviewCount,
    availability: row.availability,
    categoryId: row.categoryId,
    categorySlug: row.categorySlug,
  };
}
