"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { useCart } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import { discountPercent } from "@/components/ui/price";
import { formatMoney } from "@/lib/money";
import { SectionHeading } from "@/components/spatial";
import type { DealProduct } from "@/server/catalog";

interface FlashDealsProps {
  products: DealProduct[];
  totalDeals: number;
}

/** Seconds remaining until the next local midnight (deals reset daily). */
function secondsUntilMidnight(): number {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  return Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
}

/** Format seconds into `HH : MM : SS` for the deals countdown. */
function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  return [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");
}

export function FlashDeals({ products, totalDeals }: FlashDealsProps) {
  const { add } = useCart();
  const toast = useToast();
  // `null` until mounted so the server render and the client's first paint
  // match — a live countdown would otherwise cause a hydration mismatch.
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [addingId, setAddingId] = useState<string | null>(null);

  useEffect(() => {
    setSecondsLeft(secondsUntilMidnight());
    const id = window.setInterval(() => {
      setSecondsLeft((prev) =>
        prev === null || prev <= 1 ? secondsUntilMidnight() : prev - 1,
      );
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const clock = useMemo(() => formatClock(secondsLeft ?? 0), [secondsLeft]);
  const segments = useMemo(() => clock.split(":"), [clock]);

  const handleAdd = useCallback(
    async (deal: DealProduct) => {
      if (addingId) return;
      setAddingId(deal.id);
      try {
        await add(deal.id, 1);
        toast.success(`Added “${deal.title}” to your cart.`);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Could not add that item.",
        );
      } finally {
        setAddingId(null);
      }
    },
    [add, addingId, toast],
  );

  if (products.length === 0) return null;

  return (
    <section
      className="mx-auto w-full max-w-[1440px] px-4 py-10 sm:py-14 lg:px-8"
      aria-labelledby="deals-heading"
    >
      <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-sale)]">
            <span className="opacity-60">{"// "}</span>Flash sale
          </p>
          <h2
            id="deals-heading"
            className="mt-2 text-balance text-2xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-3xl"
          >
            Deals that don&apos;t wait — neither should you
          </h2>
        </div>

        <div className="glass-inset flex items-center gap-3 rounded-2xl px-4 py-3" aria-live="polite">
          <span className="text-xs font-medium text-[var(--color-muted-foreground)]">
            Ends in
          </span>
          <span
            className="flex items-center gap-1"
            aria-label={`Sale ends in ${clock.replace(":", " hours ")} minutes`}
          >
            {segments.map((segment, index) => (
              <span key={index} className="flex items-center gap-1">
                {index > 0 ? (
                  <span className="text-sm font-bold text-[var(--color-border-strong)]" aria-hidden>
                    :
                  </span>
                ) : null}
                <span className="min-w-[2.25rem] rounded-lg bg-[var(--color-surface)] px-2 py-1.5 text-center text-sm font-bold tabular-nums text-[var(--color-foreground)] shadow-[var(--spatial-1)]">
                  {segment}
                </span>
              </span>
            ))}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-5">
        {products.slice(0, 5).map((deal) => {
          const href = `/product/${encodeURIComponent(deal.slug)}`;
          const discount = discountPercent(deal.sellingPrice, deal.referencePrice);
          const outOfStock = deal.availability === "out_of_stock";
          const lowStock =
            !outOfStock &&
            deal.stockQuantity !== null &&
            deal.stockQuantity > 0 &&
            deal.stockQuantity <= 5;
          const adding = addingId === deal.id;
          const stockCeiling = (deal.stockQuantity ?? 0) + 10;

          return (
            <article
              key={deal.id}
              className="glass-surface depth-lift group flex flex-col overflow-hidden rounded-[var(--radius-panel)]"
            >
              <div className="relative aspect-square overflow-hidden bg-[var(--color-muted)]">
                <Link
                  href={href}
                  className="block size-full focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
                  aria-label={deal.title}
                >
                  <ImageWithFallback
                    src={deal.imageUrl ?? undefined}
                    alt={deal.title}
                    loading="lazy"
                    className="size-full object-cover transition-transform duration-500 ease-[var(--ease-spatial)] group-hover:scale-[1.06]"
                  />
                </Link>

                {discount !== null && discount > 0 ? (
                  <span className="absolute left-2.5 top-2.5 z-10 rounded-full bg-[var(--color-sale)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-[var(--spatial-1)]">
                    −{discount}%
                  </span>
                ) : null}

                <div className="absolute right-2.5 top-2.5 z-10">
                  <WishlistButton productId={deal.id} title={deal.title} size="sm" />
                </div>
              </div>

              <div className="flex flex-1 flex-col p-3.5">
                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                  {deal.brand ?? "Loop Studio"}
                </p>
                <Link
                  href={href}
                  className="mt-1 line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)]"
                >
                  {deal.title}
                </Link>

                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-base font-bold tabular-nums text-[var(--color-sale)]">
                    {formatMoney(deal.sellingPrice, deal.currency, {
                      showDecimals: false,
                    })}
                  </span>
                  {deal.referencePrice &&
                  Number(deal.referencePrice) > Number(deal.sellingPrice) ? (
                    <s className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                      {formatMoney(deal.referencePrice, deal.currency, {
                        showDecimals: false,
                      })}
                    </s>
                  ) : null}
                </div>

                <div className="mt-auto space-y-2 pt-3">
                  {outOfStock ? (
                    <p className="text-[11px] font-semibold text-[var(--color-muted-foreground)]">
                      Out of stock
                    </p>
                  ) : lowStock ? (
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-medium text-[var(--color-sale)]">
                        Only {deal.stockQuantity} left
                      </p>
                      <div
                        className="h-1.5 overflow-hidden rounded-full bg-[var(--color-muted)]"
                        role="progressbar"
                        aria-valuemin={0}
                        aria-valuemax={stockCeiling}
                        aria-valuenow={deal.stockQuantity ?? 0}
                        aria-label={`Stock: ${deal.stockQuantity} remaining`}
                      >
                        <div
                          className="h-full rounded-full bg-[var(--color-sale)]"
                          style={{
                            width: `${Math.round(
                              ((deal.stockQuantity ?? 0) / stockCeiling) * 100,
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ) : (
                    <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
                      <span className="inline-block size-1.5 rounded-full bg-[var(--color-success)]" aria-hidden />
                      In stock
                    </p>
                  )}

                  <button
                    type="button"
                    disabled={outOfStock || adding}
                    onClick={() => handleAdd(deal)}
                    aria-label={`Add ${deal.title} to cart`}
                    className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[var(--color-primary)] py-2.5 text-xs font-semibold text-[var(--color-on-primary)] shadow-[var(--spatial-2)] transition-all hover:bg-[var(--color-primary-hover)] active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {outOfStock ? (
                      "Sold out"
                    ) : (
                      <>
                        <Plus className="size-3.5" aria-hidden />
                        {adding ? "Adding…" : "Add to cart"}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/products?deals=1&sort=discount"
          className="glass-surface inline-flex items-center gap-2 rounded-full px-7 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        >
          {totalDeals > 5 ? `View all ${totalDeals} deals` : "View all deals"}
          <ArrowRight className="size-4" aria-hidden />
        </Link>
      </div>
    </section>
  );
}

export { SectionHeading };
