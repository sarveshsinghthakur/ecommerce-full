"use client";

import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface BrandFacet {
  brand: string;
  count: number;
}

export interface CategoryFilterSidebarProps {
  /** Real brand facets for the current category (with product counts). */
  brands: BrandFacet[];
  /** Total published products in scope, used to label the count badges. */
  total?: number;
}

const RATING_OPTIONS = [
  { value: "4.0", label: "4.0 & Above" },
  { value: "3.0", label: "3.0 & Above" },
  { value: "2.0", label: "2.0 & Above" },
];

/**
 * Category filter rail. Every control writes to the URL query string and the
 * server component re-queries the catalog, so the filters are real rather than
 * decorative. Multi-select brands are joined with commas in `brand`.
 */
export function CategoryFilterSidebar({
  brands,
}: CategoryFilterSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const selectedBrands = useMemo(
    () => new Set((searchParams.get("brand") ?? "").split(",").filter(Boolean)),
    [searchParams],
  );
  const minPrice = searchParams.get("min") ?? "";
  const maxPrice = searchParams.get("max") ?? "";
  const minRating = searchParams.get("rating") ?? "";
  const inStockOnly = searchParams.get("stock") === "1";

  // Local echo so typing in the price boxes feels instant; committed on Apply.
  const [minDraft, setMinDraft] = useState(minPrice);
  const [maxDraft, setMaxDraft] = useState(maxPrice);

  const apply = useCallback(
    (next: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(next)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      params.delete("page"); // filter changes reset pagination
      const qs = params.toString();
      router.push(`${pathname}${qs ? `?${qs}` : ""}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const toggleBrand = (brand: string) => {
    const next = new Set(selectedBrands);
    if (next.has(brand)) next.delete(brand);
    else next.add(brand);
    apply({ brand: next.size ? Array.from(next).join(",") : null });
  };

  const clearAll = () => {
    setMinDraft("");
    setMaxDraft("");
    router.push(pathname, { scroll: false });
  };

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = [];
    for (const b of selectedBrands) {
      chips.push({ key: `b-${b}`, label: b, clear: () => toggleBrand(b) });
    }
    if (minPrice || maxPrice) {
      chips.push({
        key: "price",
        label: minPrice && maxPrice ? `₹${minPrice}–₹${maxPrice}` : minPrice ? `Over ₹${minPrice}` : `Under ₹${maxPrice}`,
        clear: () => {
          setMinDraft("");
          setMaxDraft("");
          apply({ min: null, max: null });
        },
      });
    }
    if (minRating) {
      chips.push({
        key: "rating",
        label: `${minRating}★ & Above`,
        clear: () => apply({ rating: null }),
      });
    }
    if (inStockOnly) {
      chips.push({ key: "stock", label: "In Stock Only", clear: () => apply({ stock: null }) });
    }
    return chips;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBrands, minPrice, maxPrice, minRating, inStockOnly]);

  const hasActive = activeChips.length > 0;

  return (
    <aside className="w-full lg:w-[280px] flex-shrink-0 space-y-[var(--space-md)] lg:sticky lg:top-16">
      {/* Applied filter chips */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm space-y-[var(--space-sm)]">
        <div className="flex items-center justify-between">
          <span className="type-label-md text-[var(--color-on-surface)] font-bold flex items-center gap-1.5">
            <span className="material-symbols-outlined text-lg text-[var(--color-primary)]" aria-hidden>
              filter_list
            </span>
            Applied Filters
          </span>
          {hasActive ? (
            <button
              className="type-label-sm text-[var(--color-primary)] hover:text-[var(--color-primary-container)] transition-colors font-semibold"
              type="button"
              onClick={clearAll}
            >
              Clear All
            </button>
          ) : null}
        </div>
        {hasActive ? (
          <div className="flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 px-[var(--space-xs)] py-1 rounded-full bg-[var(--color-surface-container)] text-[var(--color-on-surface)] type-caption-micro font-medium"
              >
                {chip.label}
                <button
                  className="hover:text-[var(--color-error)] transition-colors leading-none"
                  type="button"
                  aria-label={`Remove filter ${chip.label}`}
                  onClick={chip.clear}
                >
                  <span className="material-symbols-outlined text-xs" aria-hidden>close</span>
                </button>
              </span>
            ))}
          </div>
        ) : (
          <p className="type-caption-micro text-[var(--color-on-surface-variant)]">
            No filters applied — showing everything in this category.
          </p>
        )}
      </div>

      {/* In-stock toggle */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[var(--color-primary)] text-xl" aria-hidden>
            inventory_2
          </span>
          <div>
            <label htmlFor="in-stock" className="type-label-sm text-[var(--color-on-surface)] font-semibold cursor-pointer">
              In Stock Only
            </label>
            <div className="type-caption-micro text-[var(--color-on-surface-variant)]">Hide out-of-stock items</div>
          </div>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            id="in-stock"
            checked={inStockOnly}
            className="sr-only peer"
            type="checkbox"
            onChange={(e) => apply({ stock: e.target.checked ? "1" : null })}
          />
          <div className="w-11 h-6 bg-[var(--color-surface-container-highest)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[var(--color-surface-container-lowest)] after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
        </label>
      </div>

      {/* Price range */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm space-y-[var(--space-sm)]">
        <div className="flex items-center justify-between">
          <span className="type-label-md text-[var(--color-on-surface)] font-bold">Price Range</span>
          <span className="type-caption-micro text-[var(--color-on-surface-variant)]">INR (₹)</span>
        </div>
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <label htmlFor="min-price" className="sr-only">Minimum price</label>
              <span className="absolute left-2.5 top-2.5 type-caption-micro text-[var(--color-outline)]" aria-hidden>₹</span>
              <input
                id="min-price"
                type="number"
                min={0}
                value={minDraft}
                placeholder="Min"
                onChange={(e) => setMinDraft(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[var(--color-surface-container-low)] type-body-sm text-[var(--color-on-surface)] focus:outline-none focus:bg-[var(--color-surface-container)]"
              />
            </div>
            <span className="text-[var(--color-outline)] type-caption-micro">to</span>
            <div className="relative flex-1">
              <label htmlFor="max-price" className="sr-only">Maximum price</label>
              <span className="absolute left-2.5 top-2.5 type-caption-micro text-[var(--color-outline)]" aria-hidden>₹</span>
              <input
                id="max-price"
                type="number"
                min={0}
                value={maxDraft}
                placeholder="Max"
                onChange={(e) => setMaxDraft(e.target.value)}
                className="w-full pl-6 pr-2 py-1.5 rounded-lg bg-[var(--color-surface-container-low)] type-body-sm text-[var(--color-on-surface)] focus:outline-none focus:bg-[var(--color-surface-container)]"
              />
            </div>
          </div>
          <button
            className="w-full py-1.5 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-primary)] type-label-sm font-bold transition-colors"
            type="button"
            onClick={() => apply({ min: minDraft || null, max: maxDraft || null })}
          >
            Apply Price
          </button>
        </div>
      </div>

      {/* Brand checkboxes */}
      {brands.length > 0 ? (
        <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm space-y-[var(--space-xs)]">
          <span className="type-label-md text-[var(--color-on-surface)] font-bold">Brand</span>
          <div className="space-y-2 pt-1">
            {brands.map((brand) => (
              <label
                key={brand.brand}
                className="flex items-center justify-between cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <input
                    className="w-4 h-4 rounded text-[var(--color-primary)] cursor-pointer"
                    type="checkbox"
                    checked={selectedBrands.has(brand.brand)}
                    onChange={() => toggleBrand(brand.brand)}
                  />
                  <span className="type-body-sm text-[var(--color-on-surface)] group-hover:text-[var(--color-primary)] transition-colors">
                    {brand.brand}
                  </span>
                </div>
                <span className="type-caption-micro text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-low)] px-1.5 py-0.5 rounded">
                  {brand.count}
                </span>
              </label>
            ))}
          </div>
        </div>
      ) : null}

      {/* Customer rating */}
      <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm space-y-[var(--space-xs)]">
        <span className="type-label-md text-[var(--color-on-surface)] font-bold">Customer Rating</span>
        <div className="space-y-1.5 pt-1">
          {RATING_OPTIONS.map((item) => (
            <label
              key={item.value}
              className="flex items-center gap-2 cursor-pointer hover:bg-[var(--color-surface-container-low)] p-1 rounded-lg transition-colors"
            >
              <input
                checked={minRating === item.value}
                className="w-4 h-4 text-[var(--color-primary)]"
                name="rating-filter"
                type="radio"
                onChange={() => apply({ rating: item.value })}
              />
              <div className="flex items-center gap-1 type-body-sm text-[var(--color-on-surface)]">
                <span
                  className="material-symbols-outlined text-base text-[var(--color-tertiary-container)]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                  aria-hidden
                >
                  star
                </span>
                <span className={minRating === item.value ? "font-semibold" : ""}>
                  {item.label}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}
