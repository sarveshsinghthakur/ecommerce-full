"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, Loader2, RefreshCw } from "lucide-react";
import { useWishlist } from "@/components/wishlist/wishlist-provider";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import type { ProductCard as ProductSummary } from "@/server/catalog";

type Status = "idle" | "loading" | "ready" | "error";

/**
 * Resolves the shopper's saved ids into live catalogue cards.
 *
 * The wishlist itself lives in localStorage (Loop Studio has no backend
 * wishlist store), so this is the one place that trades those ids for real
 * product rows. Removing an item is handled by the heart already on each
 * card — toggling it updates the provider, which re-runs this fetch.
 *
 * The current cards stay on screen while a refetch is in flight, so
 * un-hearting an item doesn't blank the page into a spinner.
 */
export function WishlistGrid() {
  const { ids } = useWishlist();
  const [items, setItems] = useState<ProductSummary[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async (idList: string[]) => {
    const requestId = ++requestRef.current;

    if (idList.length === 0) {
      setItems([]);
      setStatus("ready");
      setError(null);
      return;
    }

    setStatus((current) => (current === "ready" ? "ready" : "loading"));
    setError(null);

    try {
      const response = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: idList }),
      });
      if (!response.ok) throw new Error("Request failed");
      const data = (await response.json()) as { items?: ProductSummary[] };
      // Ignore a response that arrived after a newer request started.
      if (requestId !== requestRef.current) return;
      setItems(Array.isArray(data.items) ? data.items : []);
      setStatus("ready");
    } catch {
      if (requestId !== requestRef.current) return;
      setError("We couldn’t load your saved items.");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load(ids);
  }, [ids, load]);

  if (status === "loading") {
    return (
      <div className="grid min-h-64 place-items-center">
        <p className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Loading your saved items…
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="glass-inset flex flex-col items-start gap-3 rounded-[var(--radius-panel)] p-6">
        <p className="text-sm text-[var(--color-foreground)]">{error}</p>
        <Button variant="outline" size="sm" onClick={() => void load(ids)}>
          <RefreshCw className="size-4" aria-hidden />
          Try again
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="glass-inset grid place-items-center rounded-[var(--radius-panel)] px-6 py-16 text-center">
        <div className="max-w-sm">
          <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] text-[var(--color-foreground)] backdrop-blur-md">
            <Heart className="size-6" aria-hidden />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
            Nothing saved yet
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            Tap the heart on any product to keep it here. Saved items stay on
            this device between visits.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex rounded-full bg-[var(--color-primary)] px-5 py-2.5 text-sm font-semibold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            Browse the catalogue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm text-[var(--color-muted-foreground)]">
        {items.length} saved {items.length === 1 ? "item" : "items"} · stored
        on this device
      </p>
      <ProductGrid>
        {items.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </ProductGrid>
    </div>
  );
}
