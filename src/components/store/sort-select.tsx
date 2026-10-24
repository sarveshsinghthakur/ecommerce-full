"use client";

import { useRouter } from "next/navigation";
import type { SortKey } from "@/server/catalog";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "rating", label: "Top rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

/**
 * Sort control that navigates via the URL, so the choice survives a refresh,
 * is shareable, and needs no client-side data cache.
 */
export function SortSelect({
  current,
  basePath,
  params,
  label = "Sort",
}: {
  current: SortKey;
  basePath: string;
  /** Serializable filter state carried over into the new URL. */
  params: Record<string, string>;
  label?: string;
}) {
  const router = useRouter();

  function navigate(next: SortKey) {
    const search = new URLSearchParams(params);
    if (next === "newest") search.delete("sort");
    else search.set("sort", next);
    search.delete("page");
    const qs = search.toString();
    router.push(qs ? `${basePath}?${qs}` : basePath);
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sort-select" className="text-sm text-[var(--color-muted-foreground)]">
        {label}
      </label>
      <select
        id="sort-select"
        value={current}
        onChange={(event) => navigate(event.target.value as SortKey)}
        className="h-9 rounded-[var(--radius-control)] border border-[var(--color-input)] bg-white px-2.5 text-sm text-[var(--color-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
      >
        {SORTS.map((option) => (
          <option key={option.key} value={option.key}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
