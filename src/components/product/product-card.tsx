"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProductCard as ProductSummary } from "@/server/catalog";
import { useCart, useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { discountPercent } from "@/components/ui/price";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { WishlistButton } from "@/components/wishlist/wishlist-button";

export interface ProductCardProps {
  product: ProductSummary;
  readOnly?: boolean;
  priority?: boolean;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In stock",
  out_of_stock: "Out of stock",
  preorder: "Pre-order",
  unknown: "Availability unknown",
};

/**
 * The catalogue's product card.
 *
 * Photography is the subject: the image occupies the top of the card on a
 * soft neutral plate, and every other element floats around it on its own
 * glass layer — discount and stock chips top-left, the wishlist heart
 * top-right, a quick-view bar that rises from the bottom on hover.
 *
 * The card lifts and blooms its shadow on hover (`.depth-lift`), which is
 * disabled automatically for touch pointers and reduced-motion visitors.
 */
export function ProductCard({ product, readOnly, priority }: ProductCardProps) {
  const { add } = useCart();
  const { refresh } = useSession();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const discount = discountPercent(product.sellingPrice, product.referencePrice);
  const outOfStock = product.availability === "out_of_stock";

  async function addOne() {
    if (adding || added || outOfStock) return;
    setAdding(true);
    try {
      await add(product.id, 1);
      setAdded(true);
      toast.success(`Added “${product.title}” to your cart.`);
      window.setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add that item.",
      );
      await refresh();
    } finally {
      setAdding(false);
    }
  }

  async function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
    await addOne();
  }

  // Quick view is surfaced as an overlay link to the product page; the
  // add-to-cart and wishlist actions are siblings of the card link (never
  // nested inside it) to keep the markup valid and accessible.
  const productHref = `/product/${product.slug}`;
  const availabilityLabel = AVAILABILITY_LABEL[product.availability];

  return (
    <article
      className={cn(
        "glass-surface depth-lift group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-panel)]",
        outOfStock && "opacity-90",
      )}
    >
      <div className="relative">
        <Link
          href={productHref}
          className="block focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]"
          aria-label={product.title}
        >
          {/* Floating labels */}
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col items-start gap-1.5">
            {discount !== null && discount > 0 ? (
              <span className="rounded-full bg-[var(--color-sale)] px-2.5 py-1 text-[11px] font-bold tabular-nums text-white shadow-[var(--spatial-1)]">
                {discount}% off
              </span>
            ) : null}
            {product.isBestseller ? (
              <span className="glass-surface rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--color-tertiary)]">
                Bestseller
              </span>
            ) : null}
          </div>

          {/* Image plate */}
          <div className="relative aspect-square w-full overflow-hidden bg-[var(--color-muted)]">
            <ImageWithFallback
              src={product.imageUrl ?? undefined}
              alt={product.title}
              loading={priority ? "eager" : "lazy"}
              fetchPriority={priority ? "high" : "auto"}
              className="size-full object-cover transition-transform duration-500 ease-[var(--ease-spatial)] group-hover:scale-[1.06]"
            />

            {outOfStock ? (
              <div className="absolute inset-0 grid place-items-center bg-[var(--color-surface)]/60 backdrop-blur-[2px]">
                <span className="rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--color-muted-foreground)]">
                  Out of stock
                </span>
              </div>
            ) : null}

            {!readOnly ? (
              <span
                aria-hidden
                className="glass-surface pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-center gap-1.5 rounded-full py-2 text-xs font-semibold text-[var(--color-foreground)] opacity-0 transition-all duration-300 ease-[var(--ease-spatial)] translate-y-2 group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:translate-y-0 group-focus-within:opacity-100"
              >
                View details
              </span>
            ) : null}
          </div>
        </Link>

        <WishlistButton
          productId={product.id}
          title={product.title}
          size="sm"
          className="absolute right-3 top-3 z-10"
        />
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="min-w-0">
          {product.brand ? (
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              {product.brand}
            </p>
          ) : null}
          <Link
            href={productHref}
            className="mt-0.5 block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--color-foreground)] transition-colors group-hover:text-[var(--color-primary)]">
              {product.title}
            </h3>
          </Link>
        </div>

        {product.rating ? (
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-warning-soft)] px-1.5 py-0.5">
              <svg viewBox="0 0 24 24" className="size-3 text-[var(--color-warning)]" fill="currentColor" aria-hidden>
                <path d="M12 2.5l2.9 5.88 6.5.95-4.7 4.58 1.11 6.46L12 17.3l-5.81 3.07 1.11-6.46-4.7-4.58 6.5-.95L12 2.5z" />
              </svg>
              <span className="text-[11px] font-bold tabular-nums text-[var(--color-foreground)]">
                {Number(product.rating).toFixed(1)}
              </span>
            </span>
            <span className="text-[11px] tabular-nums text-[var(--color-muted-foreground)]">
              ({product.reviewCount})
            </span>
          </div>
        ) : null}

        <div className="mt-auto flex flex-col gap-2.5 pt-2">
          <div className="flex items-baseline gap-1.5">
            <span className="text-base font-bold tracking-tight tabular-nums text-[var(--color-foreground)]">
              ₹{Number(product.sellingPrice).toLocaleString(undefined, {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
              })}
            </span>
            {product.referencePrice &&
            Number(product.referencePrice) > Number(product.sellingPrice) ? (
              <s className="text-xs tabular-nums text-[var(--color-muted-foreground)]">
                ₹{Number(product.referencePrice).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </s>
            ) : null}
          </div>

          {availabilityLabel && !outOfStock ? (
            <p className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted-foreground)]">
              <span className="inline-block size-1.5 rounded-full bg-[var(--color-success)]" aria-hidden />
              {availabilityLabel}
            </p>
          ) : null}

          {!readOnly ? (
            <button
              type="button"
              onClick={handleAdd}
              disabled={outOfStock || adding}
              aria-label={`Add ${product.title} to cart`}
              className={cn(
                "flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-sm font-semibold transition-all active:scale-[0.97]",
                added
                  ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                  : outOfStock
                    ? "border border-[var(--color-border)] text-[var(--color-muted-foreground)] disabled:cursor-not-allowed disabled:opacity-60"
                    : "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--spatial-2)] hover:bg-[var(--color-primary-hover)] disabled:cursor-wait disabled:opacity-70",
              )}
            >
              {added ? (
                <>
                  <Check className="size-4" aria-hidden />
                  Added
                </>
              ) : outOfStock ? (
                "Unavailable"
              ) : (
                <>
                  <Plus className="size-4" aria-hidden />
                  {adding ? "Adding…" : "Add to cart"}
                </>
              )}
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function ProductGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
