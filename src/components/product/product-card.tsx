"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Plus, Star } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ProductCard as ProductSummary } from "@/server/catalog";
import { useCart, useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { Price, discountPercent } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";

import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export interface ProductCardProps {
  product: ProductSummary;
  /** Renders without the add-to-cart affordance (e.g. in admin previews). */
  readOnly?: boolean;
  priority?: boolean;
}

export function ProductCard({ product, readOnly, priority }: ProductCardProps) {
  const { add } = useCart();
  const { refresh } = useSession();
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const discount = discountPercent(product.sellingPrice, product.referencePrice);
  const outOfStock = product.availability === "out_of_stock";

  async function handleAdd(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();
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

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-surface)] transition-all duration-200 hover:shadow-[var(--shadow-card)] hover:border-[var(--color-border-strong)]">
      <Link
        href={`/product/${product.slug}`}
        className="block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
        aria-label={product.title}
      >
        <div className="relative aspect-square overflow-hidden bg-[var(--color-muted)]">
          <ImageWithFallback
            src={product.imageUrl ?? undefined}
            alt={product.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />

          <div className="absolute left-2 top-2 flex flex-col gap-1">
            {discount !== null ? (
              <Badge tone="sale" className="bg-white shadow-sm">
                −{discount}%
              </Badge>
            ) : null}
            {outOfStock ? (
              <Badge tone="neutral" className="bg-white shadow-sm">
                Out of stock
              </Badge>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-1.5 p-3.5">
          {product.brand ? (
            <p className="truncate text-[11px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
              {product.brand}
            </p>
          ) : null}
          <h3 className="line-clamp-2 text-sm font-medium leading-snug text-[var(--color-foreground)]">
            {product.title}
          </h3>
          <div className="mt-auto pt-1.5">
            <Price
              value={product.sellingPrice}
              compareAt={product.referencePrice}
              currency={product.currency}
            />
            {product.rating ? (
              <div className="mt-1 flex items-center gap-1 text-xs text-[var(--color-muted-foreground)]">
                <Star className="size-3 fill-[var(--color-warning)] text-[var(--color-warning)]" aria-hidden />
                <span className="tabular-nums">{Number(product.rating).toFixed(1)}</span>
                <span>({product.reviewCount})</span>
              </div>
            ) : null}
          </div>
        </div>
      </Link>

      {!readOnly ? (
        <div className="px-3.5 pb-3.5">
          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || adding}
            aria-label={`Add ${product.title} to cart`}
            className={cn(
              "inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-[var(--radius-control)] text-sm font-medium transition-colors",
              "disabled:pointer-events-none disabled:opacity-50",
              added
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                : "border border-[var(--color-border-strong)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
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
                Add to cart
              </>
            )}
          </button>
        </div>
      ) : null}
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
        "grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4",
        className,
      )}
    >
      {children}
    </div>
  );
}
