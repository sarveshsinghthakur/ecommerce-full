"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

interface Suggestion {
  id: string;
  title: string;
  brand: string | null;
  slug: string;
  imageUrl: string | null;
  price: string;
  referencePrice: string | null;
  discount: number | null;
  href: string;
}

/** Debounce before hitting the suggestions endpoint. */
const DEBOUNCE_MS = 180;
const MAX_TERM_LENGTH = 120;

/**
 * The header search field with a live suggestion dropdown.
 *
 * Suggestions are fetched from `/api/search/suggest` on a debounce and the
 * request is aborted when the term changes mid-flight, so fast typists never
 * see a stale result. Keyboard support follows the ARIA combobox pattern:
 * ArrowUp/Down move through options, Enter submits, Escape closes.
 */
export function SearchBox({
  className,
  id = "site-search",
  autoFocusOnOpen,
  onNavigate,
}: {
  className?: string;
  id?: string;
  /** When rendered inside a mobile sheet, focus the input on mount. */
  autoFocusOnOpen?: boolean;
  /** Called after a suggestion or the query is submitted. */
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (autoFocusOnOpen) inputRef.current?.focus();
  }, [autoFocusOnOpen]);

  // Close when clicking anywhere outside the field.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Debounced fetch with cancellation.
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setItems([]);
      setActiveIndex(-1);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setLoading(true);
      fetch(`/api/search/suggest?q=${encodeURIComponent(term)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error("bad status"))))
        .then((data: { items?: Suggestion[] }) => {
          setItems(Array.isArray(data.items) ? data.items : []);
          setActiveIndex(-1);
        })
        .catch(() => {
          /* Aborted or failed: typeahead is an enhancement, stay silent. */
        })
        .finally(() => setLoading(false));
    }, DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const submit = useCallback(
    (value: string) => {
      const trimmed = value.trim();
      setOpen(false);
      setActiveIndex(-1);
      onNavigate?.();
      router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/products");
    },
    [onNavigate, router],
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Escape") {
        setOpen(false);
        setActiveIndex(-1);
        return;
      }
      if (event.key === "ArrowDown" && items.length > 0) {
        event.preventDefault();
        setOpen(true);
        setActiveIndex((index) => (index + 1) % items.length);
        return;
      }
      if (event.key === "ArrowUp" && items.length > 0) {
        event.preventDefault();
        setActiveIndex((index) => (index <= 0 ? items.length - 1 : index - 1));
        return;
      }
      if (event.key === "Enter") {
        const picked = activeIndex >= 0 ? items[activeIndex] : undefined;
        if (picked) {
          event.preventDefault();
          onNavigate?.();
          router.push(picked.href);
          setOpen(false);
          return;
        }
        // Let the form's onSubmit handle a plain Enter.
      }
    },
    [activeIndex, items, onNavigate, router],
  );

  const showPanel = open && query.trim().length >= 2;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit(query);
        }}
      >
        <label htmlFor={id} className="sr-only">
          Search products
        </label>
        <div
          className={cn(
            "glass-inset flex h-11 w-full items-center gap-2 rounded-full px-4 transition-shadow",
            showPanel && "ring-2 ring-[var(--color-primary)]",
          )}
        >
          <Search className="size-4 shrink-0 text-[var(--color-muted-foreground)]" aria-hidden />
          <input
            ref={inputRef}
            id={id}
            type="search"
            role="combobox"
            aria-expanded={showPanel}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
            }
            autoComplete="off"
            value={query}
            maxLength={MAX_TERM_LENGTH}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search products, brands and essentials…"
            className="w-full min-w-0 bg-transparent text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setItems([]);
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="grid size-6 shrink-0 place-items-center rounded-full text-[var(--color-muted-foreground)] transition hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          ) : null}
        </div>
      </form>

      {showPanel ? (
        <div
          id={listId}
          role="listbox"
          aria-label="Search suggestions"
          className="glass-raised spatial-rise absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-[var(--radius-tile)] p-1.5"
        >
          {loading && items.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              Searching…
            </p>
          ) : null}

          {!loading && items.length === 0 ? (
            <p className="px-3 py-4 text-center text-xs text-[var(--color-muted-foreground)]">
              No matches for “{query.trim()}” — press Enter to see all results.
            </p>
          ) : null}

          {items.map((item, index) => (
            <Link
              key={item.id}
              id={`${listId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              href={item.href}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={cn(
                "flex items-center gap-3 rounded-[var(--radius-control)] px-2.5 py-2 transition-colors",
                index === activeIndex
                  ? "bg-[var(--color-primary-soft)]"
                  : "hover:bg-[var(--color-muted)]",
              )}
            >
              <span className="size-10 shrink-0 overflow-hidden rounded-lg bg-[var(--color-muted)]">
                <ImageWithFallback
                  src={item.imageUrl ?? undefined}
                  alt=""
                  className="size-full object-cover"
                />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-[var(--color-foreground)]">
                  {item.title}
                </span>
                {item.brand ? (
                  <span className="block truncate text-xs text-[var(--color-muted-foreground)]">
                    {item.brand}
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 text-right">
                <span className="block text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                  {item.price}
                </span>
                {item.discount ? (
                  <span className="block text-xs font-medium text-[var(--color-sale)]">
                    −{item.discount}%
                  </span>
                ) : null}
              </span>
            </Link>
          ))}

          <button
            type="button"
            onClick={() => submit(query)}
            className="mt-1 w-full rounded-[var(--radius-control)] px-3 py-2 text-left text-xs font-medium text-[var(--color-primary)] transition hover:bg-[var(--color-muted)]"
          >
            See all results for “{query.trim()}”
          </button>
        </div>
      ) : null}
    </div>
  );
}
