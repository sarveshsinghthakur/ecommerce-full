"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";
import { useCart, useSession } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui/feedback";
import { Price } from "@/components/ui/price";
import { ConfirmDialog } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { MAX_LINE_QUANTITY, type CartLine } from "@/lib/cart/types";

/** Free shipping threshold in the store's default currency units. */
const FREE_SHIPPING_THRESHOLD = 499;
const FLAT_SHIPPING_FEE = 49;

export function CartPage() {
  const router = useRouter();
  const { view, loading, error, setQuantity, remove, clear, refresh } = useCart();
  const { authenticated, loading: sessionLoading } = useSession();
  const toast = useToast();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  if (loading && !view && !error) return <LoadingState label="Loading your cart…" />;
  if (error && !view) return <ErrorState description={error} onRetry={() => void refresh()} />;

  if (!view || view.lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingCart />}
        title="Your cart is empty"
        description="Browse the catalogue and add something you like — it will stay here between visits."
        action={
          <Link
            href="/products"
            className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Start shopping
          </Link>
        }
      />
    );
  }

  const subtotal = Number(view.subtotal);
  const qualifiesFree = subtotal >= FREE_SHIPPING_THRESHOLD;
  const shipping = qualifiesFree ? 0 : FLAT_SHIPPING_FEE;
  const total = subtotal + shipping;

  async function changeQuantity(line: CartLine, next: number) {
    if (next < 1 || next > MAX_LINE_QUANTITY || next === line.quantity) return;
    setBusyId(line.id);
    try {
      await setQuantity(line.id, next);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the quantity.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleRemove(line: CartLine) {
    setBusyId(line.id);
    try {
      await remove(line.id);
      toast.success(`Removed “${line.title}” from your cart.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not remove that item.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleClear() {
    setConfirmClear(false);
    try {
      await clear();
      toast.success("Cart cleared.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not clear the cart.");
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
      <div>
        <ul className="flex flex-col divide-y divide-[var(--color-border)] rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white">
          {view.lines.map((line) => {
            const busy = busyId === line.id;
            const maxed = (line.stockQuantity ?? MAX_LINE_QUANTITY) <= line.quantity;

            return (
              <li key={line.id} className="flex gap-4 p-4 sm:p-5">
                <Link
                  href={`/product/${line.slug}`}
                  className="size-20 shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-muted)] sm:size-24"
                >
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="grid size-full place-items-center text-[10px] text-[var(--color-muted-foreground)]">
                      No image
                    </div>
                  )}
                </Link>

                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/product/${line.slug}`}
                        className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                      >
                        {line.title}
                      </Link>
                      <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                        {line.brand ?? "Aurora"}
                        {!line.purchasable ? " · Unavailable" : ""}
                      </p>
                    </div>
                    <Price
                      value={line.lineTotal}
                      currency={line.currency}
                      className="shrink-0 text-sm"
                    />
                  </div>

                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)]">
                      <button
                        type="button"
                        aria-label={`Decrease quantity of ${line.title}`}
                        disabled={busy || line.quantity <= 1}
                        onClick={() => void changeQuantity(line, line.quantity - 1)}
                        className="grid size-9 place-items-center text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40"
                      >
                        <Minus className="size-3.5" aria-hidden />
                      </button>
                      <span className="w-8 text-center text-sm font-medium tabular-nums">
                        {line.quantity}
                      </span>
                      <button
                        type="button"
                        aria-label={`Increase quantity of ${line.title}`}
                        disabled={busy || maxed}
                        onClick={() => void changeQuantity(line, line.quantity + 1)}
                        className="grid size-9 place-items-center text-[var(--color-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-40"
                      >
                        <Plus className="size-3.5" aria-hidden />
                      </button>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                      <span className="tabular-nums">
                        <Price
                          value={line.sellingPrice}
                          currency={line.currency}
                          compact
                        />{" "}
                        each
                      </span>
                      <button
                        type="button"
                        onClick={() => void handleRemove(line)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 font-medium text-[var(--color-destructive)] hover:underline disabled:opacity-50"
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                        Remove
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/products"
            className="text-sm font-medium text-[var(--color-primary)] hover:underline"
          >
            ← Continue shopping
          </Link>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Clear cart
          </Button>
        </div>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Order summary</h2>

          <dl className="mt-4 flex flex-col gap-2 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-muted-foreground)]">
                Subtotal ({view.itemCount} item{view.itemCount === 1 ? "" : "s"})
              </dt>
              <dd className="font-medium tabular-nums">
                <Price value={view.subtotal} currency={view.currency} />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-muted-foreground)]">Shipping</dt>
              <dd className="font-medium tabular-nums">
                {qualifiesFree ? (
                  <span className="text-[var(--color-success)]">Free</span>
                ) : (
                  <Price value={String(FLAT_SHIPPING_FEE)} currency={view.currency} />
                )}
              </dd>
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
              <dt className="font-semibold text-[var(--color-foreground)]">Total</dt>
              <dd className="font-semibold tabular-nums">
                <Price value={String(total)} currency={view.currency} />
              </dd>
            </div>
          </dl>

          {!qualifiesFree ? (
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              Add{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                <Price
                  value={String(FREE_SHIPPING_THRESHOLD - subtotal)}
                  currency={view.currency}
                  compact
                />
              </span>{" "}
              more for free shipping.
            </p>
          ) : null}

          <Button
            fullWidth
            className="mt-4"
            onClick={() => router.push("/checkout")}
          >
            Checkout
            <ArrowRight className="size-4" aria-hidden />
          </Button>

          {!authenticated && !sessionLoading ? (
            <p className="mt-3 text-center text-xs text-[var(--color-muted-foreground)]">
              Checking out as a guest?{" "}
              <Link
                href="/login?next=/checkout"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Sign in
              </Link>{" "}
              to track the order.
            </p>
          ) : null}

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
            Prices include the store markup over source cost. Shipping is
            calculated before payment.
          </p>
        </div>
      </aside>

      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Clear your cart?"
        description="Every item will be removed. This cannot be undone."
        confirmLabel="Clear cart"
        destructive
        onConfirm={handleClear}
      />
    </div>
  );
}
