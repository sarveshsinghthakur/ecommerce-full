import { NextResponse } from "next/server";
import { getProductsByIds } from "@/server/catalog";
import { clientSubject, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";

export const runtime = "nodejs";

/** Wishlist ids live in the browser, so this is always re-resolved. */
export const dynamic = "force-dynamic";

const MAX_IDS = 60;

/**
 * POST /api/wishlist  { ids: string[] }
 *
 * Hydrates a client-side wishlist into real catalogue rows so the wishlist
 * page can render live cards. The wishlist itself is not stored server-side —
 * this endpoint only answers "which of these ids are still published?"
 *
 * Deliberately returns 200 with an empty list for bad input rather than an
 * error: a stale or corrupted localStorage entry should degrade to "nothing
 * saved", never to a crash.
 */
export async function POST(request: Request) {
  const limit = await enforceRateLimit({
    bucket: "wishlist-hydrate",
    subject: clientSubject(request.headers),
    limit: Math.max(30, serverEnv().RATE_LIMIT_CONTACT * 5),
    windowSeconds: 300,
  });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please slow down." },
      { status: 429 },
    );
  }

  let ids: unknown;
  try {
    const body = (await request.json()) as { ids?: unknown };
    ids = body.ids;
  } catch {
    ids = undefined;
  }

  if (!Array.isArray(ids)) {
    return NextResponse.json({ items: [] });
  }

  const cleaned = ids
    .filter((id): id is string => typeof id === "string")
    .map((id) => id.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS);

  if (cleaned.length === 0) return NextResponse.json({ items: [] });

  try {
    const items = await getProductsByIds(cleaned, MAX_IDS);
    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "private, max-age=30, stale-while-revalidate=120",
        },
      },
    );
  } catch (error) {
    console.error("[wishlist] hydrate failed", error);
    return NextResponse.json(
      { error: "Couldn’t load your saved items." },
      { status: 500 },
    );
  }
}
