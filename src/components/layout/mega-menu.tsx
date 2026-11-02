"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Grid2X2, ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import type { NavCategory } from "@/components/layout/site-header";

export interface MegaMenuProps {
  open: boolean;
  onClose: () => void;
  categories: NavCategory[];
  /** Anchor the panel under this element (set by the trigger button). */
  triggerRef?: React.RefObject<HTMLElement | null>;
}

/** Departments shown as the wide column; the rest fall into the dense list. */
const FEATURED_SLUGS = new Set([
  "electronics-and-accessories",
  "home-and-kitchen",
  "grocery-and-gourmet",
  "fashion-and-apparel",
]);

/**
 * The "All Categories" mega-menu.
 *
 * A floating frosted panel with real catalogue categories (so no link can
 * 404), a featured column for the headline departments, and a dense list for
 * the remainder. Closes on Escape, on outside click, and on route change;
 * returns focus to its trigger so keyboard users are never stranded.
 */
export function MegaMenu({ open, onClose, categories, triggerRef }: MegaMenuProps) {
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        triggerRef?.current?.focus();
      }
    };
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !panelRef.current?.contains(target) &&
        !triggerRef?.current?.contains(target)
      ) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
    };
  }, [onClose, open, triggerRef]);

  if (!open) return null;

  const featured = categories.filter((category) => FEATURED_SLUGS.has(category.slug));
  const rest = categories.filter((category) => !FEATURED_SLUGS.has(category.slug));

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="All categories"
      className="glass-raised spatial-rise absolute left-0 top-full z-50 mt-3 w-[min(56rem,calc(100vw-2rem))] rounded-[var(--radius-panel)] p-6"
    >
      <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
        {/* Featured departments */}
        <div>
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <span className="opacity-60">{"// "}</span>Featured
          </p>
          <ul className="mt-3 flex flex-col gap-1">
            {(featured.length > 0 ? featured : categories.slice(0, 4)).map(
              (category) => (
                <li key={category.slug}>
                  <Link
                    href={`/category/${category.slug}`}
                    onClick={onClose}
                    className="group flex items-center gap-3 rounded-[var(--radius-control)] p-2 transition-colors hover:bg-[var(--color-muted)]"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
                      <Grid2X2 className="size-4" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1 truncate text-sm font-medium text-[var(--color-foreground)]">
                      {category.name}
                    </span>
                    <ArrowRight
                      className="size-4 shrink-0 -translate-x-1 text-[var(--color-muted-foreground)] opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100"
                      aria-hidden
                    />
                  </Link>
                </li>
              ),
            )}
          </ul>
        </div>

        {/* Dense list of the remaining departments */}
        <div className="md:col-span-2">
          <p className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-[var(--color-accent)]">
            <span className="opacity-60">{"// "}</span>All departments
          </p>
          <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-0.5 sm:grid-cols-2">
            {rest.map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  onClick={onClose}
                  className="block truncate rounded-[var(--radius-control)] px-2 py-1.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Footer strip */}
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border)] pt-4">
        <p className="text-xs text-[var(--color-muted-foreground)]">
          Every department is generated from the live catalogue.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <MegaMenuLink href="/products?deals=1&sort=discount" onClose={onClose} tone="sale">
            Today&apos;s Deals
          </MegaMenuLink>
          <MegaMenuLink href="/products?sort=newest" onClose={onClose}>
            New Arrivals
          </MegaMenuLink>
          <MegaMenuLink href="/products?max=499" onClose={onClose} tone="accent">
            Under ₹499 Bazaar
          </MegaMenuLink>
          <Link
            href="/categories"
            onClick={onClose}
            className={cn(
              "rounded-full bg-[var(--color-primary)] px-4 py-2 text-xs font-semibold text-[var(--color-on-primary)] transition hover:bg-[var(--color-primary-hover)]",
            )}
          >
            Browse all categories
          </Link>
        </div>
      </div>
    </div>
  );
}

function MegaMenuLink({
  href,
  onClose,
  tone,
  children,
}: {
  href: string;
  onClose: () => void;
  tone?: "sale" | "accent";
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClose}
      className={cn(
        "rounded-full border px-3.5 py-2 text-xs font-semibold transition",
        tone === "sale" &&
          "border-[var(--color-sale)]/30 bg-[var(--color-sale-soft)] text-[var(--color-sale)] hover:border-[var(--color-sale)]",
        tone === "accent" &&
          "border-[var(--color-tertiary)]/30 bg-[var(--color-tertiary-fixed)] text-[var(--color-on-tertiary-fixed)] hover:border-[var(--color-tertiary)]",
        !tone && "border-[var(--color-border)] text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
      )}
    >
      {children}
    </Link>
  );
}
