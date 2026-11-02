"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart, useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { discountPercent } from "@/components/ui/price";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { SectionHeading } from "@/components/spatial";
import type { ProductCard as ProductSummary, ProductDetail } from "@/server/catalog";

interface ProductSpecsTableProps {
  product: ProductDetail;
  related: ProductSummary[];
}

/**
 * Real product facts, presented as a spec sheet.
 *
 * Every row is computed from the catalogue row — nothing here is invented.
 * The previous version listed eight hardware specifications (driver size,
 * ANC depth, codec support) that were hardcoded for one headphone and shown
 * on every product in the store, alongside a "frequently bought together"
 * bundle containing items that don't exist in the catalogue and a total
 * that didn't add up.
 */
export function ProductSpecsTable({ product, related }: ProductSpecsTableProps) {
  const { add } = useCart();
  const { refresh } = useSession();
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);

  const sellingPrice = Number(product.sellingPrice);
  const referencePrice = product.referencePrice
    ? Number(product.referencePrice)
    : null;
  const discount = discountPercent(product.sellingPrice, product.referencePrice);
  const available = product.availability !== "out_of_stock";

  const rows: { label: string; value: string }[] = [
    { label: "Brand", value: product.brand ?? "Loop Studio" },
    {
      label: "Category",
      value: product.category?.name ?? "Uncategorised",
    },
    {
      label: "Selling price",
      value: `₹${sellingPrice.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      })}`,
    },
    referencePrice
      ? {
          label: "Listed price",
          value: `₹${referencePrice.toLocaleString()}`,
        }
      : null,
    discount && discount > 0
      ? { label: "Discount", value: `${discount}% off` }
      : null,
    {
      label: "Customer rating",
      value: product.rating
        ? `${Number(product.rating).toFixed(1)} / 5 · ${product.reviewCount.toLocaleString()} ${
            product.reviewCount === 1 ? "review" : "reviews"
          }`
        : "Not yet rated",
    },
    {
      label: "Availability",
      value: available ? "In stock" : "Out of stock",
    },
    {
      label: "Listed",
      value: product.publishedAt
        ? new Date(product.publishedAt).toLocaleDateString(undefined, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : "—",
    },
  ].filter(Boolean) as { label: string; value: string }[];

  /** Adds every related item to the bag in sequence; reports a real result. */
  async function handleAddAll() {
    if (busy || related.length === 0) return;
    setBusy(true);
    let ok = 0;
    for (const item of related) {
      try {
        await add(item.id, 1);
        ok += 1;
      } catch {
        // Keep going: one unavailable item shouldn't abort the rest.
      }
    }
    setBusy(false);

    if (ok > 0) {
      setAdded(true);
      toast.success(
        ok === related.length
          ? `Added ${ok} ${ok === 1 ? "item" : "items"} to your cart.`
          : `Added ${ok} of ${related.length} items — the rest couldn’t be added.`,
      );
      window.setTimeout(() => setAdded(false), 2400);
    } else {
      toast.error("Couldn’t add those items to your cart.");
      await refresh();
    }
  }

  const bundleTotal =
    related.reduce((sum, item) => sum + Number(item.sellingPrice), 0) +
    sellingPrice;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      {/* Spec sheet */}
      <div className="lg:col-span-7">
        <SectionHeading
          eyebrow="Product details"
          title="Specifications"
          description="Everything below comes straight from the catalogue listing."
        />
        <dl className="glass-surface mt-6 overflow-hidden rounded-[var(--radius-panel)]">
          {rows.map((row, index) => (
            <div
              key={row.label}
              className={cn(
                "grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-3 sm:gap-4 sm:px-5",
                index !== rows.length - 1 && "border-b border-[var(--glass-line)]",
              )}
            >
              <dt className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                {row.label}
              </dt>
              <dd className="text-sm font-medium text-[var(--color-foreground)] sm:col-span-2">
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Real related items */}
      <div className="lg:col-span-5">
        <SectionHeading eyebrow="Pairs well with" title="Complete the look" />
        <div className="glass-surface mt-6 flex flex-col gap-4 rounded-[var(--radius-panel)] p-5">
          {related.length === 0 ? (
            <p className="text-sm text-[var(--color-muted-foreground)]">
              No related items are listed alongside this product yet.
            </p>
          ) : (
            <>
              <ul className="flex flex-col gap-3">
                {related.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={`/product/${item.slug}`}
                      className="group flex items-center gap-3 rounded-[var(--radius-tile)] p-2 transition-colors hover:bg-[var(--glass-fill-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      <div className="size-16 shrink-0 overflow-hidden rounded-[var(--radius-tile)] border border-[var(--glass-line)] bg-[var(--glass-inset)]">
                        <ImageWithFallback
                          src={item.imageUrl ?? undefined}
                          alt={item.title}
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-[var(--dur-base)] group-hover:scale-105 motion-reduce:group-hover:scale-100"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-medium leading-snug text-[var(--color-foreground)]">
                          {item.title}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                          ₹
                          {Number(item.sellingPrice).toLocaleString(undefined, {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}
                        </p>
                      </div>
                      <Layers
                        aria-hidden
                        className="size-4 shrink-0 text-[var(--color-muted-foreground)]"
                        strokeWidth={1.75}
                      />
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="flex flex-col gap-3 border-t border-[var(--glass-line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="block text-xs text-[var(--color-muted-foreground)]">
                    This item + {related.length}{" "}
                    {related.length === 1 ? "other" : "others"}
                  </span>
                  <span className="text-lg font-bold tabular-nums text-[var(--color-foreground)]">
                    ₹
                    {bundleTotal.toLocaleString(undefined, {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 0,
                    })}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddAll}
                  disabled={busy}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                    added
                      ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                      : "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--spatial-2)] hover:bg-[var(--color-primary-hover)]",
                    busy && "cursor-wait opacity-80",
                  )}
                >
                  {added ? (
                    <>
                      <Check aria-hidden className="size-4" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus aria-hidden className="size-4" />
                      {busy ? "Adding…" : "Add all to cart"}
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
