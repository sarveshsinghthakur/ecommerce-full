import { NextResponse } from "next/server";
import { suggestProducts } from "@/server/catalog";
import { clientSubject, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { discountPercent } from "@/components/ui/price";

export const runtime = "nodejs";

/** Live typeahead used by the header search. Cached briefly by the browser. */
export const dynamic = "force-dynamic";

const MAX_TERM_LENGTH = 120;
const RESULT_LIMIT = 6;

/**
 * GET /api/search/suggest?q=…
 *
 * Returns a compact payload for the header's live search dropdown. Kept
 * deliberately small (id, title, price, image) so each keystroke transfers
 * very little, and rate-limited because it hits the catalogue on every call.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = (searchParams.get("q") ?? "").trim().slice(0, MAX_TERM_LENGTH);

  if (!term) {
    return NextResponse.json({ items: [], term: "" });
  }

  const limit = await enforceRateLimit({
    bucket: "search-suggest",
    subject: clientSubject(request.headers),
    // Generous enough for fast typing, tight enough to keep the trigram
    // lookups from being hammered by a scripted client.
    limit: Math.max(60, serverEnv().RATE_LIMIT_CONTACT * 10),
    windowSeconds: 300,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many searches. Please slow down." },
      { status: 429 },
    );
  }

  try {
    const matches = await suggestProducts(term, RESULT_LIMIT);

    return NextResponse.json(
      {
        term,
        items: matches.map((product) => ({
          id: product.id,
          title: product.title,
          brand: product.brand,
          slug: product.slug,
          imageUrl: product.imageUrl,
          price: formatMoney(product.sellingPrice, product.currency, {
            showDecimals: false,
          }),
          referencePrice:
            product.referencePrice &&
            Number(product.referencePrice) > Number(product.sellingPrice)
              ? formatMoney(product.referencePrice, product.currency, {
                  showDecimals: false,
                })
              : null,
          discount: discountPercent(
            product.sellingPrice,
            product.referencePrice,
          ),
          href: `/product/${product.slug}`,
        })),
      },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=60" } },
    );
  } catch (error) {
    console.error("[search-suggest] lookup failed", error);
    // Typeahead is an enhancement: fail soft so the search box still works.
    return NextResponse.json({ items: [], term });
  }
}
