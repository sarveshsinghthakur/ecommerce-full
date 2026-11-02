"use client";

import { useCallback } from "react";
import { Heart } from "lucide-react";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";
import { useWishlist } from "./wishlist-provider";

export interface WishlistButtonProps {
  productId: string;
  title?: string;
  size?: "sm" | "lg";
  className?: string;
}

/**
 * Heart-shaped wishlist toggle. Frontend-only: state lives in localStorage
 * (see src/lib/wishlist) because Loop Studio has no backend wishlist API.
 *
 * The heart scales and settles with a spring when toggled, and fills only
 * when saved, so the current state is legible at a glance.
 */
export function WishlistButton({
  productId,
  title,
  size = "sm",
  className,
}: WishlistButtonProps) {
  const { isWishlisted, toggle } = useWishlist();
  const toast = useToast();
  const active = isWishlisted(productId);

  const handleClick = useCallback(() => {
    const added = toggle(productId);
    toast.push(
      added
        ? `Added "${title ?? productId}" to your wishlist.`
        : `Removed from your wishlist.`,
      added ? "success" : "info",
    );
  }, [productId, title, toggle, toast]);

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={active}
      className={cn(
        "glass-surface relative grid place-items-center rounded-full transition-all duration-300 ease-[var(--ease-spring)] hover:scale-110 active:scale-95",
        size === "lg" ? "size-11" : "size-9",
        active
          ? "text-[var(--color-error)]"
          : "text-[var(--color-muted-foreground)] hover:text-[var(--color-error)]",
        className,
      )}
    >
      <Heart
        aria-hidden
        className={cn(
          "transition-all duration-300 ease-[var(--ease-spring)]",
          size === "lg" ? "size-5" : "size-4",
          active && "scale-110 fill-current",
        )}
      />
      {active ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-[var(--color-error)]/40 animate-ping"
        />
      ) : null}
    </button>
  );
}
