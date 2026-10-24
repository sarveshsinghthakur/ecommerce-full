"use client";

import { useState } from "react";
import { Check, Heart, Minus, Plus, ShoppingBag } from "lucide-react";
import { MAX_LINE_QUANTITY } from "@/lib/cart/types";
import { useCart, useSession } from "@/components/providers";
import { useToast } from "@/components/ui/toast";

export function PurchasePanel({
  productId,
  available,
  availabilityLabel,
}: {
  productId: string;
  available: boolean;
  availabilityLabel: string;
}) {
  const { add } = useCart();
  const { refresh } = useSession();
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [wishlisted, setWishlisted] = useState(false);

  async function handleAdd() {
    if (busy || !available) return;
    setBusy(true);
    try {
      await add(productId, quantity);
      setAdded(true);
      toast.success(quantity > 1 ? `Added ${quantity} items to your cart.` : "Added to your cart.");
      window.setTimeout(() => setAdded(false), 2000);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add that item.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  function toggleWishlist() {
    setWishlisted((v) => !v);
    toast.info(
      wishlisted
        ? "Removed from your wishlist."
        : "Saved to your wishlist — sign in to keep it.",
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div
          className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)]"
          role="group"
          aria-label="Quantity"
        >
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            disabled={quantity <= 1}
            aria-label="Decrease quantity"
            className="grid h-full w-10 place-items-center rounded-l-[var(--radius-control)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40"
          >
            <Minus className="size-4" aria-hidden />
          </button>
          <span
            className="w-10 text-center text-sm font-medium tabular-nums"
            aria-live="polite"
          >
            {quantity}
          </span>
          <button
            type="button"
            onClick={() => setQuantity((q) => Math.min(MAX_LINE_QUANTITY, q + 1))}
            disabled={quantity >= MAX_LINE_QUANTITY}
            aria-label="Increase quantity"
            className="grid h-full w-10 place-items-center rounded-r-[var(--radius-control)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
          </button>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={!available || busy}
          className={added
            ? "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-success-soft)] px-5 text-sm font-medium text-[var(--color-success)]"
            : "inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50"}
        >
          {added ? (
            <>
              <Check className="size-4" aria-hidden />
              Added to cart
            </>
          ) : (
            <>
              <ShoppingBag className="size-4" aria-hidden />
              {available ? "Add to cart" : "Unavailable"}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={toggleWishlist}
          aria-pressed={wishlisted}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
        >
          <Heart
            className={wishlisted ? "size-4 fill-[var(--color-destructive)] text-[var(--color-destructive)]" : "size-4"}
            aria-hidden
          />
        </button>
      </div>

      <p className="text-sm text-[var(--color-muted-foreground)]" role="status">
        {availabilityLabel}
      </p>
    </div>
  );
}
