"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BadgeCheck,
  Check,
  ChevronRight,
  Minus,
  PackageCheck,
  Plus,
  RotateCcw,
  ShieldCheck,
  ShoppingCart,
  Truck,
} from "lucide-react";
import { useCart, useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";
import { MAX_LINE_QUANTITY } from "@/lib/cart/types";
import { cn } from "@/lib/cn";
import { WishlistButton } from "@/components/wishlist/wishlist-button";
import type { ProductDetail } from "@/server/catalog";

interface ProductDetailBuyBoxProps {
  product: ProductDetail;
  discount: number | null;
  available: boolean;
}

const AVAILABILITY_COPY: Record<string, string> = {
  in_stock: "In stock and ready to ship",
  out_of_stock: "Currently out of stock",
  preorder: "Available for pre-order",
};

/**
 * The purchase panel.
 *
 * Everything shown here is derived from the real catalogue row: price,
 * savings, rating, review count and stock state. Nothing is invented — an
 * earlier version rendered a colour/edition configurator, bank offers, a
 * pincode ETA and a stock countdown that were all hardcoded to a single
 * fictional headphone and had no effect on what actually landed in the cart.
 */
export function ProductDetailBuyBox({
  product,
  discount,
  available,
}: ProductDetailBuyBoxProps) {
  const { add } = useCart();
  const { refresh } = useSession();
  const toast = useToast();
  const router = useRouter();

  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState<"cart" | "buy" | null>(null);
  const [added, setAdded] = useState(false);

  const sellingPrice = Number(product.sellingPrice);
  const referencePrice = product.referencePrice
    ? Number(product.referencePrice)
    : null;
  const outOfStock = !available;
  const lowStock =
    typeof product.stockQuantity === "number" &&
    product.stockQuantity > 0 &&
    product.stockQuantity <= 5;

  // Reset the transient "Added" confirmation if the shopper changes quantity.
  useEffect(() => {
    setAdded(false);
  }, [quantity]);

  async function addLine(): Promise<boolean> {
    try {
      await add(product.id, quantity);
      setAdded(true);
      toast.success(
        quantity > 1
          ? `Added ${quantity} × “${product.title}” to your cart.`
          : `Added “${product.title}” to your cart.`,
      );
      window.setTimeout(() => setAdded(false), 2400);
      return true;
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not add that item.",
      );
      await refresh();
      return false;
    }
  }

  async function handleAdd() {
    if (busy || outOfStock) return;
    setBusy("cart");
    try {
      await addLine();
    } finally {
      setBusy(null);
    }
  }

  /** Buy now = add the current line, then hand off to the checkout route. */
  async function handleBuyNow() {
    if (busy || outOfStock) return;
    setBusy("buy");
    try {
      if (await addLine()) router.push("/checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Brand / authenticity strip */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {product.brand ? (
          <Link
            href={`/products?brand=${encodeURIComponent(product.brand)}`}
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:text-[var(--color-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {product.brand}
            <BadgeCheck
              aria-hidden
              className="size-4 text-[var(--color-accent)]"
              strokeWidth={1.75}
            />
            <ChevronRight
              aria-hidden
              className="size-3.5 opacity-60 transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        ) : (
          <span className="text-sm font-medium text-[var(--color-muted-foreground)]">
            Loop Studio
          </span>
        )}
        <WishlistButton productId={product.id} title={product.title} size="lg" />
      </div>

      <h1 className="text-balance text-2xl font-semibold leading-snug tracking-tight text-[var(--color-foreground)] sm:text-3xl">
        {product.title}
      </h1>

      {/* Rating + reviews (real counts from the catalogue) */}
      {product.rating ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] px-2.5 py-1 backdrop-blur-md">
            <svg
              viewBox="0 0 24 24"
              className="size-3.5 text-[var(--color-warning)]"
              fill="currentColor"
              aria-hidden
            >
              <path d="M12 2.5l2.9 5.88 6.5.95-4.7 4.58 1.11 6.46L12 17.3l-5.81 3.07 1.11-6.46-4.7-4.58 6.5-.95L12 2.5z" />
            </svg>
            <span className="text-xs font-bold tabular-nums text-[var(--color-foreground)]">
              {Number(product.rating).toFixed(1)}
            </span>
          </span>
          <a
            href="#reviews"
            className="text-sm tabular-nums text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {product.reviewCount.toLocaleString()}{" "}
            {product.reviewCount === 1 ? "review" : "reviews"}
          </a>
        </div>
      ) : null}

      {/* Price */}
      <div className="glass-inset rounded-[var(--radius-panel)] p-4">
        <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
          <span className="text-3xl font-bold tracking-tight tabular-nums text-[var(--color-foreground)]">
            ₹{sellingPrice.toLocaleString(undefined, {
              minimumFractionDigits: 0,
              maximumFractionDigits: 0,
            })}
          </span>
          {referencePrice && referencePrice > sellingPrice ? (
            <>
              <s className="text-base tabular-nums text-[var(--color-muted-foreground)]">
                ₹{referencePrice.toLocaleString()}
              </s>
              {discount !== null && discount > 0 ? (
                <span className="rounded-full bg-[var(--color-sale)] px-2.5 py-1 text-xs font-bold tabular-nums text-white">
                  {discount}% off
                </span>
              ) : null}
            </>
          ) : null}
        </div>
        <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
          Inclusive of all taxes. Final price is confirmed at checkout.
        </p>
      </div>

      {/* Stock state — driven by the real availability field */}
      <div className="flex flex-col gap-1.5">
        <p
          className={cn(
            "flex items-center gap-2 text-sm font-medium",
            outOfStock
              ? "text-[var(--color-muted-foreground)]"
              : "text-[var(--color-success)]",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "inline-block size-2 rounded-full",
              outOfStock
                ? "bg-[var(--color-muted-foreground)]"
                : "bg-[var(--color-success)]",
            )}
          />
          {AVAILABILITY_COPY[product.availability] ?? "Availability updated at checkout"}
        </p>
        {lowStock ? (
          <p className="text-xs text-[var(--color-warning)]">
            Only {product.stockQuantity} left — order soon.
          </p>
        ) : null}
        {product.category ? (
          <Link
            href={`/category/${product.category.slug}`}
            className="text-xs text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Browse more in {product.category.name}
          </Link>
        ) : null}
      </div>

      {/* Quantity + primary actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex h-12 items-center gap-1 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] px-1.5 backdrop-blur-md">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1 || busy !== null || outOfStock}
              aria-label="Decrease quantity"
              className="grid size-9 place-items-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--glass-fill-strong)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              <Minus aria-hidden className="size-4" />
            </button>
            <span
              className="w-7 text-center text-sm font-semibold tabular-nums text-[var(--color-foreground)]"
              aria-live="polite"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
              disabled={quantity >= MAX_LINE_QUANTITY || busy !== null || outOfStock}
              aria-label="Increase quantity"
              className="grid size-9 place-items-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--glass-fill-strong)] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              <Plus aria-hidden className="size-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleAdd}
            disabled={outOfStock || busy !== null}
            className={cn(
              "flex h-12 flex-1 min-w-[9rem] items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold transition-all active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
              added
                ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                : "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--spatial-2)] hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--spatial-3)]",
              outOfStock &&
                "cursor-not-allowed bg-[var(--glass-fill)] text-[var(--color-muted-foreground)] shadow-none",
              busy !== null && "cursor-wait opacity-80",
            )}
          >
            {added ? (
              <>
                <Check aria-hidden className="size-4" />
                Added to bag
              </>
            ) : (
              <>
                <ShoppingCart aria-hidden className="size-4" />
                {busy === "cart" ? "Adding…" : "Add to cart"}
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleBuyNow}
            disabled={outOfStock || busy !== null}
            className="flex h-12 items-center justify-center gap-2 rounded-full border border-[var(--glass-line-strong)] bg-[var(--glass-fill-strong)] px-6 text-sm font-semibold text-[var(--color-foreground)] backdrop-blur-md transition-colors hover:bg-[var(--color-foreground)] hover:text-[var(--color-background)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {busy === "buy" ? "Taking you to checkout…" : "Buy now"}
          </button>
        </div>

        {outOfStock ? (
          <p className="text-xs text-[var(--color-muted-foreground)]">
            This item can’t be added to the bag right now.
          </p>
        ) : null}
      </div>

      {/* fulfilment assurances — the same promises stated in the trust strip */}
      <ul className="grid grid-cols-3 gap-2">
        {[
          { icon: Truck, label: "Free shipping" },
          { icon: RotateCcw, label: "7-day returns" },
          { icon: ShieldCheck, label: "1-yr warranty" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <li
              key={item.label}
              className="glass-inset flex flex-col items-center gap-1.5 rounded-[var(--radius-tile)] px-2 py-3 text-center"
            >
              <Icon
                aria-hidden
                className="size-4.5 text-[var(--color-foreground)]"
                strokeWidth={1.75}
              />
              <span className="text-[11px] font-medium leading-tight text-[var(--color-muted-foreground)]">
                {item.label}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
        <PackageCheck aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />
        Dispatched by Loop Studio. Delivery date shown at checkout.
      </p>
    </div>
  );
}
