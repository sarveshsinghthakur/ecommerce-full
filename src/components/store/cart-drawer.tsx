"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ShoppingBag,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useCart } from "@/components/providers";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

const FREE_SHIPPING_THRESHOLD = 499;

/**
 * A global quick-cart surface opened by the header without leaving the page.
 *
 * Focus is trapped while open, Escape closes it, the body is locked, and
 * returning focus goes back to whatever opened it. All surfaces use the
 * theme-aware glass tokens so the drawer reads correctly in light and dark.
 */
export function CartDrawer() {
  const { view, loading, remove } = useCart();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const openDrawer = () => {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setOpen(true);
    };
    window.addEventListener("loop:open-cart", openDrawer);
    return () => window.removeEventListener("loop:open-cart", openDrawer);
  }, []);

  useEffect(() => {
    if (!open) return;

    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Move focus into the dialog so keyboard users aren't stranded behind it.
    const raf = window.requestAnimationFrame(() => {
      panelRef.current
        ?.querySelector<HTMLElement>("button, a[href]")
        ?.focus();
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>('a[href],button:not([disabled])'),
      );
      if (focusable.length === 0) return;
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.body.style.overflow = priorOverflow;
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus();
    };
  }, [open, close]);

  async function removeLine(id: string) {
    setBusyId(id);
    try {
      await remove(id);
    } finally {
      setBusyId(null);
    }
  }

  if (!open || typeof document === "undefined") return null;

  const subtotal = Number(view.subtotal);
  const remaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const progress = Math.min(100, (subtotal / FREE_SHIPPING_THRESHOLD) * 100);

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="presentation">
      <button
        type="button"
        aria-label="Close cart"
        className="absolute inset-0 w-full cursor-default bg-[var(--color-inverse-surface)]/55 backdrop-blur-[3px]"
        onClick={close}
      />

      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className="glass-raised cart-drawer-enter absolute inset-y-0 right-0 flex w-full max-w-md flex-col overflow-hidden rounded-none border-y-0 border-r-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--glass-line)] px-5 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-accent)]">
              Your bag
            </p>
            <h2 className="mt-0.5 truncate text-xl font-semibold tracking-tight text-[var(--color-foreground)]">
              {loading
                ? "Loading cart"
                : `${view.itemCount} ${view.itemCount === 1 ? "item" : "items"}`}
            </h2>
          </div>
          <button
            type="button"
            onClick={close}
            aria-label="Close cart"
            className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] text-[var(--color-foreground)] backdrop-blur-md transition-colors hover:bg-[var(--glass-fill-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        {/* Lines */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!loading && view.lines.length === 0 ? (
            <div className="grid min-h-64 place-items-center text-center">
              <div>
                <span className="mx-auto grid size-14 place-items-center rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] text-[var(--color-foreground)] backdrop-blur-md">
                  <ShoppingBag className="size-6" aria-hidden />
                </span>
                <h3 className="mt-4 font-semibold text-[var(--color-foreground)]">
                  Your bag is waiting
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  Find something made for your everyday.
                </p>
                <Link
                  onClick={close}
                  href="/products"
                  className="mt-5 inline-flex rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                >
                  Explore products
                </Link>
              </div>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {view.lines.map((line) => (
                <li
                  key={line.id}
                  className="glass-inset flex gap-3 rounded-[var(--radius-tile)] p-3"
                >
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={close}
                    className="size-16 shrink-0 overflow-hidden rounded-[var(--radius-tile)] border border-[var(--glass-line)] bg-[var(--glass-fill-soft)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    <ImageWithFallback
                      src={line.imageUrl ?? undefined}
                      alt=""
                      className="size-full object-cover"
                    />
                  </Link>

                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${line.slug}`}
                      onClick={close}
                      className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)] underline-offset-4 hover:text-[var(--color-primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {line.title}
                    </Link>
                    <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                      Qty {line.quantity} · {line.brand ?? "Loop Studio"}
                    </p>
                    <p className="mt-1.5 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                      {formatMoney(line.lineTotal, line.currency)}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={busyId === line.id}
                    onClick={() => void removeLine(line.id)}
                    aria-label={`Remove ${line.title} from bag`}
                    className="grid size-9 shrink-0 place-items-center self-end rounded-full text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-destructive)]/10 hover:text-[var(--color-destructive)] disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Footer */}
        {view.lines.length > 0 ? (
          <div className="border-t border-[var(--glass-line)] p-5">
            <div
              className="h-1.5 overflow-hidden rounded-full bg-[var(--glass-fill-soft)]"
              role="progressbar"
              aria-valuenow={Math.round(progress)}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progress toward free delivery"
            >
              <div
                className={cn(
                  "h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-500 ease-[var(--ease-spatial)]",
                  remaining === 0 && "w-full",
                )}
                style={
                  remaining === 0
                    ? undefined
                    : { width: `${progress}%` }
                }
              />
            </div>

            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              {remaining === 0 ? (
                <>
                  <Sparkles className="size-3.5 text-[var(--color-success)]" aria-hidden />
                  Free delivery unlocked — nice choice.
                </>
              ) : (
                <>
                  <strong className="font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatMoney(String(remaining), view.currency)}
                  </strong>
                  away from free delivery.
                </>
              )}
            </p>

            <div className="mt-4 flex items-end justify-between">
              <span className="text-sm text-[var(--color-muted-foreground)]">
                Subtotal
              </span>
              <strong className="text-xl font-semibold tabular-nums text-[var(--color-foreground)]">
                {formatMoney(view.subtotal, view.currency)}
              </strong>
            </div>

            <Link
              href="/checkout"
              onClick={close}
              className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-on-primary)] shadow-[var(--spatial-2)] transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              Secure checkout
              <ArrowRight className="size-4" aria-hidden />
            </Link>

            <Link
              href="/cart"
              onClick={close}
              className="mt-3 block text-center text-sm font-medium text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
            >
              View full cart
            </Link>
          </div>
        ) : null}
      </aside>
    </div>,
    document.body,
  );
}
