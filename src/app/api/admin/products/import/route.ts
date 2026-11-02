import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { productImportJobs } from "@/db/schema";
import { AuthError, requireAdmin } from "@/lib/auth/authorize";
import { scrapeProductPage, validateImportUrl, normalizeSourceUrl } from "@/lib/import/scrape";
import { newId } from "@/lib/ids";
import { findListingByNormalizedUrl } from "@/server/admin-products";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

/**
 * Fetches a product link (Meesho, Flipkart, Shopify store, brand site, …) and
 * returns a parsed preview for the admin form. Nothing is written to the
 * catalog here — the preview is persisted only as an import-job row so every
 * attempt (including failures) stays auditable.
 */

const importSchema = z.object({
  url: z.string().trim().min(1, "Paste a product link.").max(2048),
});

export async function POST(request: Request) {
  try {
    const admin = await requireAdmin();
    const parsed = await parseRequest(request, importSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const url = validateImportUrl(parsed.data.url);
    if (!url) {
      return NextResponse.json(
        {
          error:
            "Enter a full product link starting with http:// or https:// (private or local addresses are not allowed).",
          code: "invalid_url",
        },
        { status: 400 },
      );
    }

    const started = Date.now();
    const outcome = await scrapeProductPage(url.toString());
    const durationMs = Date.now() - started;

    const jobId = newId("imp");
    await db.insert(productImportJobs).values({
      id: jobId,
      url: url.toString(),
      provider: outcome.ok ? outcome.preview.provider : outcome.provider,
      status: outcome.ok
        ? outcome.missingFields.length > 0
          ? "partial"
          : "succeeded"
        : "failed",
      preview: outcome.ok ? outcome.preview : null,
      errorCode: outcome.ok ? null : outcome.code,
      errorMessage: outcome.ok ? null : outcome.message,
      warnings: outcome.ok ? outcome.warnings : [],
      missingFields: outcome.ok ? outcome.missingFields : [],
      durationMs,
      actorUid: admin.user.firebaseUid,
      actorEmail: admin.user.email,
      finishedAt: new Date(),
    });

    if (!outcome.ok) {
      return NextResponse.json(
        {
          error: outcome.message,
          code: outcome.code,
          provider: outcome.provider,
          jobId,
        },
        { status: outcome.code === "invalid_url" ? 400 : 422 },
      );
    }

    // Duplicate detection: same canonical URL already in the catalog?
    const existing = await findListingByNormalizedUrl(
      normalizeSourceUrl(url.toString()),
    );

    return NextResponse.json({
      jobId,
      preview: outcome.preview,
      warnings: outcome.warnings,
      missingFields: outcome.missingFields,
      existing:
        existing && existing.productId
          ? { productId: existing.productId, title: existing.productTitle }
          : null,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[admin/import] unexpected error", error);
    return NextResponse.json(
      { error: "Import failed unexpectedly. Check the server logs." },
      { status: 500 },
    );
  }
}
