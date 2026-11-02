import "server-only";

import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  categories,
  productImages,
  productImportJobs,
  productPriceHistory,
  products,
  sourceListings,
} from "@/db/schema";
import { writeAudit } from "@/lib/audit";
import { newId } from "@/lib/ids";
import { detectProvider, normalizeSourceUrl } from "@/lib/import/scrape";
import { priceFromSource } from "@/lib/pricing/engine";
import { uniqueSlug } from "@/lib/slug";

/**
 * Admin product mutations: create and update.
 *
 * Pricing always flows source → markup → selling (never selling → source), so
 * an imported or manually entered product can never double-apply markup. A
 * selling-price override is an explicit admin decision stored alongside the
 * computed value, and both remain separately auditable.
 */

/* -------------------------------------------------------------------------- */
/* Input schema                                                                */
/* -------------------------------------------------------------------------- */

const moneyField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount, e.g. 1299 or 1299.50.");

const imageUrlField = z
  .string()
  .trim()
  .max(2048, "Image URL is too long.")
  .refine((v) => /^https?:\/\/\S+$/i.test(v), "Image URL must start with http:// or https://.");

export const productFormSchema = z
  .object({
    title: z.string().trim().min(2, "Title is required.").max(200),
    slug: z.string().trim().max(220).optional().or(z.literal("")),
    brand: z.string().trim().max(120).optional().or(z.literal("")),
    description: z.string().trim().max(5000).optional().or(z.literal("")),
    categoryId: z.string().trim().max(64).optional().or(z.literal("")),
    sourcePrice: moneyField.optional().or(z.literal("")),
    markupPercent: z.coerce
      .number()
      .min(0, "Markup cannot be negative.")
      .max(100, "Markup above 100% is not allowed.")
      .default(9),
    sellingPriceOverride: moneyField.optional().or(z.literal("")),
    referencePrice: moneyField.optional().or(z.literal("")),
    stockQuantity: z.coerce
      .number()
      .int("Stock must be a whole number.")
      .min(0, "Stock cannot be negative.")
      .max(1_000_000)
      .optional(),
    availability: z
      .enum(["in_stock", "out_of_stock", "preorder", "unknown"])
      .default("in_stock"),
    status: z
      .enum(["draft", "needs_review", "published", "unpublished"])
      .default("draft"),
    rating: z.coerce.number().min(0).max(5).optional(),
    reviewCount: z.coerce.number().int().min(0).max(1_000_000).optional(),
    images: z.array(imageUrlField).max(12, "At most 12 images.").default([]),
    keywords: z.string().trim().max(500).optional().or(z.literal("")),
    seoTitle: z.string().trim().max(170).optional().or(z.literal("")),
    seoDescription: z.string().trim().max(320).optional().or(z.literal("")),
    /** Source provenance when the product came from a link import. */
    sourceUrl: z.string().trim().max(2048).optional().or(z.literal("")),
    sourceProvider: z.string().trim().max(40).optional().or(z.literal("")),
    importId: z.string().trim().max(64).optional().or(z.literal("")),
  })
  .refine((data) => Boolean(data.sourcePrice || data.sellingPriceOverride), {
    message: "Enter a source price (before markup), or a selling-price override.",
    path: ["sourcePrice"],
  });

export type ProductFormInput = z.infer<typeof productFormSchema>;

export interface AdminActor {
  uid: string;
  email: string;
  ip?: string | null;
}

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

export interface AdminCategoryOption {
  id: string;
  name: string;
}

export function adminListCategories(): Promise<AdminCategoryOption[]> {
  return db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.isActive, true))
    .orderBy(categories.position, categories.name);
}

export interface AdminProductDetail {
  id: string;
  slug: string;
  title: string;
  brand: string | null;
  description: string | null;
  categoryId: string | null;
  currency: string;
  sourcePrice: string | null;
  markupPercent: string | null;
  sellingPrice: string | null;
  priceOverride: boolean;
  referencePrice: string | null;
  status: string;
  availability: string;
  rating: string | null;
  reviewCount: number;
  stockQuantity: number | null;
  searchKeywords: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  images: Array<{ url: string; position: number }>;
}

export async function adminGetProduct(id: string): Promise<AdminProductDetail | null> {
  const [row] = await db.select().from(products).where(eq(products.id, id)).limit(1);
  if (!row) return null;
  const images = await db
    .select({ url: productImages.url, position: productImages.position })
    .from(productImages)
    .where(eq(productImages.productId, id))
    .orderBy(productImages.position);
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    brand: row.brand,
    description: row.description,
    categoryId: row.categoryId,
    currency: row.currency,
    sourcePrice: row.sourcePrice,
    markupPercent: row.markupPercent,
    sellingPrice: row.sellingPrice,
    priceOverride: row.priceOverride,
    referencePrice: row.referencePrice,
    status: row.status,
    availability: row.availability,
    rating: row.rating,
    reviewCount: row.reviewCount,
    stockQuantity: row.stockQuantity,
    searchKeywords: row.searchKeywords,
    seoTitle: row.seoTitle,
    seoDescription: row.seoDescription,
    images: images.map((img) => ({ url: img.url, position: img.position })),
  };
}

/* -------------------------------------------------------------------------- */
/* Create / update                                                             */
/* -------------------------------------------------------------------------- */

async function slugIsTaken(candidate: string): Promise<boolean> {
  const [row] = await db
    .select({ id: products.id })
    .from(products)
    .where(eq(products.slug, candidate))
    .limit(1);
  return Boolean(row);
}

function pricingFor(input: ProductFormInput) {
  const computed = priceFromSource(input.sourcePrice || null, input.markupPercent, "INR");
  const override = input.sellingPriceOverride || null;
  return {
    computed,
    sellingPrice: override ?? computed.sellingPrice,
    priceOverride: Boolean(override),
  };
}

export async function adminCreateProduct(
  input: ProductFormInput,
  actor: AdminActor,
): Promise<{ id: string; slug: string; sellingPrice: string }> {
  const { computed, sellingPrice, priceOverride } = pricingFor(input);
  const id = newId("prd");
  const slug = await uniqueSlug(input.slug || input.title, slugIsTaken);

  return db.transaction(async (tx) => {
    await tx.insert(products).values({
      id,
      slug,
      title: input.title,
      brand: input.brand || null,
      description: input.description || null,
      categoryId: input.categoryId || null,
      currency: "INR",
      sourcePrice: input.sourcePrice || null,
      markupPercent: String(input.markupPercent),
      calculatedSellingPrice: computed.calculatedSellingPrice,
      sellingPrice,
      priceOverride,
      referencePrice: input.referencePrice || null,
      priceVerifiedAt: input.sourcePrice ? new Date() : null,
      status: input.status,
      rating: input.rating != null ? input.rating.toFixed(2) : null,
      reviewCount: input.reviewCount ?? 0,
      stockQuantity: input.stockQuantity ?? null,
      availability: input.availability,
      searchKeywords: input.keywords || null,
      seoTitle: input.seoTitle || null,
      seoDescription: input.seoDescription || null,
      importCount: input.sourceUrl ? 1 : 0,
      lastImportedAt: input.sourceUrl ? new Date() : null,
      publishedAt: input.status === "published" ? new Date() : null,
    });

    if (input.images.length > 0) {
      await tx.insert(productImages).values(
        input.images.map((url, index) => ({
          id: newId("img"),
          productId: id,
          url,
          position: index,
          source: input.sourceUrl ? "imported" : "admin",
        })),
      );
    }

    await tx.insert(productPriceHistory).values({
      id: newId("prh"),
      productId: id,
      sourcePrice: input.sourcePrice || null,
      markupPercent: String(input.markupPercent),
      calculatedSellingPrice: computed.calculatedSellingPrice,
      sellingPrice,
      currency: "INR",
      reason: input.sourceUrl ? "initial_import" : "admin_edit",
      actorUid: actor.uid,
      note: input.sourceUrl
        ? `Imported from ${input.sourceProvider || "external link"}.`
        : "Created in the admin panel.",
    });

    if (input.sourceUrl) {
      await tx
        .insert(sourceListings)
        .values({
          id: newId("src"),
          productId: id,
          provider: input.sourceProvider || detectProvider(input.sourceUrl),
          sourceUrl: input.sourceUrl,
          sourceUrlNormalized: normalizeSourceUrl(input.sourceUrl),
          sourcePrice: input.sourcePrice || null,
          sourceCurrency: "INR",
          fetchedAt: new Date(),
          verifiedAt: new Date(),
        })
        .onConflictDoNothing({ target: sourceListings.sourceUrlNormalized });
    }

    if (input.importId) {
      await tx
        .update(productImportJobs)
        .set({ productId: id, status: "succeeded", finishedAt: new Date() })
        .where(eq(productImportJobs.id, input.importId));
    }

    await writeAudit(
      {
        action: input.sourceUrl ? "import.approve" : "product.create",
        actorUid: actor.uid,
        actorEmail: actor.email,
        targetType: "product",
        targetId: id,
        summary: `Created “${input.title}” at ₹${sellingPrice}${priceOverride ? " (override)" : ""}`,
        after: { slug, status: input.status, sellingPrice, sourceUrl: input.sourceUrl || null },
        ip: actor.ip,
      },
      tx,
    );

    return { id, slug, sellingPrice };
  });
}

export async function adminUpdateProduct(
  productId: string,
  input: ProductFormInput,
  actor: AdminActor,
): Promise<{ id: string; slug: string; sellingPrice: string } | null> {
  const [existing] = await db
    .select()
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  if (!existing) return null;

  const { computed, sellingPrice, priceOverride } = pricingFor(input);
  const slug =
    input.slug && input.slug !== existing.slug
      ? await uniqueSlug(input.slug, slugIsTaken)
      : existing.slug;
  const priceChanged =
    String(existing.sellingPrice ?? "") !== sellingPrice ||
    String(existing.sourcePrice ?? "") !== (input.sourcePrice || null);

  return db.transaction(async (tx) => {
    await tx
      .update(products)
      .set({
        slug,
        title: input.title,
        brand: input.brand || null,
        description: input.description || null,
        categoryId: input.categoryId || null,
        sourcePrice: input.sourcePrice || null,
        markupPercent: String(input.markupPercent),
        calculatedSellingPrice: computed.calculatedSellingPrice,
        sellingPrice,
        priceOverride,
        referencePrice: input.referencePrice || null,
        priceVerifiedAt: input.sourcePrice ? new Date() : existing.priceVerifiedAt,
        status: input.status,
        publishedAt:
          input.status === "published"
            ? (existing.publishedAt ?? new Date())
            : existing.publishedAt,
        rating: input.rating != null ? input.rating.toFixed(2) : null,
        reviewCount: input.reviewCount ?? 0,
        stockQuantity: input.stockQuantity ?? null,
        availability: input.availability,
        searchKeywords: input.keywords || null,
        seoTitle: input.seoTitle || null,
        seoDescription: input.seoDescription || null,
        updatedAt: new Date(),
      })
      .where(eq(products.id, productId));

    // Images are replaced wholesale — the textarea is the source of truth.
    await tx.delete(productImages).where(eq(productImages.productId, productId));
    if (input.images.length > 0) {
      await tx.insert(productImages).values(
        input.images.map((url, index) => ({
          id: newId("img"),
          productId,
          url,
          position: index,
          source: input.sourceUrl ? "imported" : "admin",
        })),
      );
    }

    if (priceChanged) {
      await tx.insert(productPriceHistory).values({
        id: newId("prh"),
        productId,
        sourcePrice: input.sourcePrice || null,
        markupPercent: String(input.markupPercent),
        calculatedSellingPrice: computed.calculatedSellingPrice,
        sellingPrice,
        currency: "INR",
        reason: priceOverride ? "manual_override" : "admin_edit",
        actorUid: actor.uid,
        note: "Edited in the admin panel.",
      });
    }

    if (input.sourceUrl) {
      await tx
        .insert(sourceListings)
        .values({
          id: newId("src"),
          productId,
          provider: input.sourceProvider || detectProvider(input.sourceUrl),
          sourceUrl: input.sourceUrl,
          sourceUrlNormalized: normalizeSourceUrl(input.sourceUrl),
          sourcePrice: input.sourcePrice || null,
          sourceCurrency: "INR",
          fetchedAt: new Date(),
          verifiedAt: new Date(),
        })
        .onConflictDoNothing({ target: sourceListings.sourceUrlNormalized });
    }

    await writeAudit(
      {
        action: "product.update",
        actorUid: actor.uid,
        actorEmail: actor.email,
        targetType: "product",
        targetId: productId,
        summary: `Updated “${input.title}”${priceChanged ? ` — price ₹${existing.sellingPrice ?? "?"} → ₹${sellingPrice}` : ""}`,
        before: {
          title: existing.title,
          status: existing.status,
          sellingPrice: existing.sellingPrice,
          stockQuantity: existing.stockQuantity,
        },
        after: { title: input.title, status: input.status, sellingPrice, stockQuantity: input.stockQuantity ?? null },
        ip: actor.ip,
      },
      tx,
    );

    return { id: productId, slug, sellingPrice };
  });
}

/** Correlated title lookup, same pattern as `src/server/admin.ts`. */
const listingProductTitle = sql<string | null>`(
  select p.title from products p where p.id = ${sourceListings.productId}
)`;

/** Duplicate detection for the import route: has this URL been imported? */
export async function findListingByNormalizedUrl(
  normalized: string,
): Promise<{ productId: string | null; productTitle: string | null } | null> {
  const [row] = await db
    .select({
      productId: sourceListings.productId,
      productTitle: listingProductTitle,
    })
    .from(sourceListings)
    .where(eq(sourceListings.sourceUrlNormalized, normalized))
    .limit(1);
  if (!row) return null;
  return { productId: row.productId, productTitle: row.productTitle };
}
