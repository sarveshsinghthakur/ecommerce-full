import Link from "next/link";
import { ChevronLeft, ChevronRight, SlidersHorizontal } from "lucide-react";
import {
  listBrands,
  listCategories,
  listProducts,
  type SortKey,
} from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { EmptyState } from "@/components/ui/feedback";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const SORTS: Array<{ key: SortKey; label: string }> = [
  { key: "newest", label: "Newest" },
  { key: "rating", label: "Top rated" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
];

interface SearchParams {
  category?: string;
  brand?: string;
  min?: string;
  max?: string;
  sort?: string;
  page?: string;
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const sort = SORTS.some((s) => s.key === sp.sort) ? (sp.sort as SortKey) : "newest";
  const min = sp.min?.match(/^\d+(\.\d{1,2})?$/) ? sp.min : null;
  const max = sp.max?.match(/^\d+(\.\d{1,2})?$/) ? sp.max : null;
  const brand = sp.brand?.slice(0, 80) ?? null;

  const [categories, brands, current] = await Promise.all([
    listCategories(),
    listBrands(),
    listProducts({ page, pageSize: 24, sort, minPrice: min, maxPrice: max, brand }),
  ]);

  const activeCategory = sp.category
    ? categories.find((c) => c.slug === sp.category)
    : undefined;

  const baseUrl = "/products";
  function withParams(next: Record<string, string | null>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string | null> = {
      category: activeCategory?.slug ?? null,
      brand,
      min,
      max,
      sort: sort === "newest" ? null : sort,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `${baseUrl}?${qs}` : baseUrl;
  }

  return (
    <div className="container-page py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-[var(--color-muted-foreground)]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-[var(--color-foreground)]">
              Home
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-[var(--color-foreground)]">
            {activeCategory ? activeCategory.name : "All products"}
          </li>
        </ol>
      </nav>

      <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
        <aside className="w-full shrink-0 lg:w-56">
          <div className="flex items-center gap-2 pb-3 lg:pb-0">
            <SlidersHorizontal className="size-4 text-[var(--color-muted-foreground)]" aria-hidden />
            <h2 className="text-sm font-semibold">Filters</h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-1">
            <FilterGroup title="Category">
              <FilterLink href={withParams({ category: null, page: null })} active={!activeCategory}>
                All products
              </FilterLink>
              {categories.map((category) => (
                <FilterLink
                  key={category.id}
                  href={withParams({ category: category.slug, page: null })}
                  active={activeCategory?.slug === category.slug}
                  count={category.productCount}
                >
                  {category.name}
                </FilterLink>
              ))}
            </FilterGroup>

            {brands.length > 1 ? (
              <FilterGroup title="Brand">
                <FilterLink href={withParams({ brand: null, page: null })} active={!brand}>
                  All brands
                </FilterLink>
                {brands.map((name) => (
                  <FilterLink
                    key={name}
                    href={withParams({ brand: name, page: null })}
                    active={brand === name}
                  >
                    {name}
                  </FilterLink>
                ))}
              </FilterGroup>
            ) : null}

            <FilterGroup title="Price">
              <form
                action={baseUrl}
                className="flex items-center gap-2"
                key={`${min ?? ""}-${max ?? ""}`}
              >
                {activeCategory ? (
                  <input type="hidden" name="category" value={activeCategory.slug} />
                ) : null}
                {brand ? <input type="hidden" name="brand" value={brand} /> : null}
                {sort !== "newest" ? <input type="hidden" name="sort" value={sort} /> : null}
                <label className="sr-only" htmlFor="min-price">
                  Minimum price
                </label>
                <input
                  id="min-price"
                  name="min"
                  inputMode="decimal"
                  placeholder="Min"
                  defaultValue={min ?? ""}
                  className="h-9 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--color-input)] px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <span aria-hidden className="text-[var(--color-muted-foreground)]">
                  –
                </span>
                <label className="sr-only" htmlFor="max-price">
                  Maximum price
                </label>
                <input
                  id="max-price"
                  name="max"
                  inputMode="decimal"
                  placeholder="Max"
                  defaultValue={max ?? ""}
                  className="h-9 w-full min-w-0 rounded-[var(--radius-control)] border border-[var(--color-input)] px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
                <button
                  type="submit"
                  className="h-9 shrink-0 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-3 text-sm font-medium hover:bg-white"
                >
                  Apply
                </button>
              </form>
              {min || max ? (
                <Link
                  href={withParams({ min: null, max: null, page: null })}
                  className="mt-2 inline-block text-xs font-medium text-[var(--color-primary)] hover:underline"
                >
                  Clear price filter
                </Link>
              ) : null}
            </FilterGroup>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[var(--color-muted-foreground)]">
              {current.total} product{current.total === 1 ? "" : "s"}
              {activeCategory ? ` in ${activeCategory.name}` : ""}
            </p>
            <SortSelect
              current={sort}
              basePath="/products"
              params={Object.fromEntries(
                Object.entries({
                  category: activeCategory?.slug,
                  brand,
                  min,
                  max,
                }).filter(([, v]) => Boolean(v)) as [string, string][],
              )}
            />
          </div>

          {current.items.length > 0 ? (
            <>
              <ProductGrid>
                {current.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </ProductGrid>

              {current.pageCount > 1 ? (
                <nav
                  aria-label="Pagination"
                  className="mt-8 flex items-center justify-center gap-2"
                >
                  <PageLink
                    href={withParams({ page: String(current.page - 1) })}
                    disabled={current.page <= 1}
                    label="Previous"
                    icon={<ChevronLeft className="size-4" aria-hidden />}
                  />
                  <span className="px-3 text-sm text-[var(--color-muted-foreground)]">
                    Page {current.page} of {current.pageCount}
                  </span>
                  <PageLink
                    href={withParams({ page: String(current.page + 1) })}
                    disabled={current.page >= current.pageCount}
                    label="Next"
                    icon={<ChevronRight className="size-4" aria-hidden />}
                  />
                </nav>
              ) : null}
            </>
          ) : (
            <EmptyState
              title="No products match these filters"
              description="Try widening the price range, clearing the brand, or browsing a different category."
              action={
                <Link
                  href="/products"
                  className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                >
                  Clear all filters
                </Link>
              }
            />
          )}
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">{title}</h3>
      <div className="flex flex-col gap-0.5">{children}</div>
    </section>
  );
}

function FilterLink({
  href,
  active,
  count,
  children,
}: {
  href: string;
  active?: boolean;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
        active
          ? "bg-[var(--color-primary-soft)] font-medium text-[var(--color-primary)]"
          : "text-[var(--color-muted-foreground)] hover:bg-white hover:text-[var(--color-foreground)]",
      )}
    >
      <span className="truncate">{children}</span>
      {typeof count === "number" ? (
        <span className="text-xs tabular-nums opacity-70">{count}</span>
      ) : null}
    </Link>
  );
}

function PageLink({
  href,
  disabled,
  label,
  icon,
}: {
  href: string;
  disabled?: boolean;
  label: string;
  icon: React.ReactNode;
}) {
  if (disabled) {
    return (
      <span
        aria-disabled
        className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-border)] px-3 text-sm text-[var(--color-muted-foreground)] opacity-50"
      >
        {icon}
        {label}
      </span>
    );
  }
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center gap-1 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-white"
    >
      {icon}
      {label}
    </Link>
  );
}
