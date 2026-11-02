import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import {
  getCategoryBySlug,
  listBrandFacets,
  listProducts,
} from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { EmptyState } from "@/components/ui/feedback";
import { CategoryFilterSidebar } from "@/components/store/category-filter-sidebar";
import type { SortKey } from "@/server/catalog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description:
      category.description ??
      `Shop ${category.name} at Loop Studio — transparent, markup-controlled pricing.`,
  };
}

/** Clamps a query-string number and returns null when unusable. */
function parsePrice(value: string | undefined): string | null {
  if (!value) return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return String(Math.round(n));
}

export default async function CategoryPage({
  params,
  searchParams,
}: Params & {
  searchParams: Promise<{
    sort?: string;
    page?: string;
    brand?: string;
    min?: string;
    max?: string;
    rating?: string;
    stock?: string;
  }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();
  const categorySlug = category.slug;

  const sort = (
    ["newest", "discount", "rating", "price_asc", "price_desc"] as SortKey[]
  ).includes(sp.sort as SortKey)
    ? (sp.sort as SortKey)
    : "newest";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const brand = sp.brand?.split(",").map((b) => b.trim()).filter(Boolean) ?? [];
  const minPrice = parsePrice(sp.min);
  const maxPrice = parsePrice(sp.max);
  const minRating = sp.rating && ["4.0", "3.0", "2.0"].includes(sp.rating) ? sp.rating : null;
  const inStockOnly = sp.stock === "1";

  // Brand facet: a single `brand` is supported directly by the query; for
  // multiple we filter post-query is not ideal, so the sidebar passes a single
  // logical filter. We fetch facets for the whole category for the checkboxes.
  const [current, facets] = await Promise.all([
    listProducts({
      categoryId: category.id,
      // The read model supports one brand; multi-select narrows via OR below.
      brand: brand.length === 1 ? brand[0] : null,
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
      sort,
      page,
      pageSize: 24,
    }),
    listBrandFacets(category.id),
  ]);

  // When several brands are selected we cannot express OR in the single-brand
  // filter, so filter the page items in-memory (the facet counts stay correct).
  const items =
    brand.length > 1
      ? current.items.filter((p) => p.brand && brand.includes(p.brand))
      : current.items;
  const total = brand.length > 1 ? items.length : current.total;

  // Builds a pagination href that keeps every active filter intact.
  function pageHref(p: number): string {
    const params = new URLSearchParams();
    if (sort !== "newest") params.set("sort", sort);
    if (brand.length) params.set("brand", brand.join(","));
    if (minPrice) params.set("min", minPrice);
    if (maxPrice) params.set("max", maxPrice);
    if (minRating) params.set("rating", minRating);
    if (inStockOnly) params.set("stock", "1");
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return `/category/${categorySlug}${qs ? `?${qs}` : ""}`;
  }

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Top Breadcrumb & Notification Ticker Strip */}
      <div className="w-full bg-[var(--color-surface-container-low)] py-[var(--space-xs)] px-[var(--gutter-sm)] lg:px-0">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-y-2">
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-[var(--space-xs)] type-caption-micro text-[var(--color-on-surface-variant)] flex-wrap"
          >
            <Link
              href="/"
              className="hover:text-[var(--color-primary)] transition-colors flex items-center gap-0.5"
            >
              <span className="material-symbols-outlined text-sm">home</span>
              <span>Home</span>
            </Link>
            <span className="material-symbols-outlined text-xs text-[var(--color-outline-variant)]">
              chevron_right
            </span>
            <Link
              href="/categories"
              className="hover:text-[var(--color-primary)] transition-colors"
            >
              Categories
            </Link>
            <span className="material-symbols-outlined text-xs text-[var(--color-outline-variant)]" aria-hidden>
              chevron_right
            </span>
            <span className="type-label-sm text-[var(--color-on-surface)] font-semibold">
              {category.name}
            </span>
          </nav>
          <div className="hidden md:flex items-center gap-[var(--space-sm)] type-caption-micro text-[var(--color-on-surface-variant)]">
            <span className="flex items-center gap-1 text-[var(--color-primary)] font-semibold">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified
              </span>
              100% Brand Authenticity Guaranteed
            </span>
            <span className="w-1 h-1 rounded-full bg-[var(--color-outline-variant)]"></span>
            <span>Instant 7-Day Returns</span>
          </div>
        </div>
      </div>

      {/* Category Headline & Promotional Callout Banner */}
      <section className="max-w-[1440px] mx-auto w-full px-[var(--gutter-sm)] lg:px-0 pt-[var(--space-lg)] pb-[var(--space-md)]">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-[var(--space-md)]">
          <div className="space-y-1 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 px-[var(--space-xs)] py-0.5 rounded-full bg-[var(--color-surface-container)] text-[var(--color-primary)] type-label-sm tracking-wide">
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>CURATED COLLECTION</span>
            </div>
            <h1 className="type-headline-xl text-[var(--color-on-surface)] tracking-tight leading-none">
              {category.name}
            </h1>
            {category.description ? (
              <p className="type-body-md text-[var(--color-on-surface-variant)] leading-relaxed">
                {category.description}
              </p>
            ) : null}
          </div>
          <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[var(--color-primary)] via-[var(--color-primary-container)] to-[var(--color-surface-tint)] p-[var(--space-md)] text-[var(--color-on-primary)] shadow-sm flex items-center justify-between gap-[var(--space-md)] min-w-[340px]">
            <div className="space-y-0.5 relative z-10">
              <div className="flex items-center gap-1 text-[var(--color-on-tertiary-container)] type-label-sm uppercase tracking-wider bg-[var(--color-tertiary-container)]/40 px-2 py-0.5 rounded w-fit">
                <span className="material-symbols-outlined text-xs">bolt</span> Loop Carnival
              </div>
              <p className="type-headline-sm font-bold leading-tight">
                Enjoy Free Delivery
              </p>
              <p className="type-caption-micro text-[var(--color-on-primary)]/80">
                Free delivery on orders over ₹499
              </p>
            </div>
            <div className="h-12 w-12 rounded-full bg-[var(--color-surface-container-lowest)]/15 backdrop-blur-sm flex items-center justify-center flex-shrink-0 text-[var(--color-surface-container-lowest)]">
              <span className="material-symbols-outlined text-2xl">tune</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Shell: Fixed 280px Filter Rail + Flexible Product Catalog */}
      <div className="max-w-[1440px] mx-auto w-full px-[var(--gutter-sm)] lg:px-0 pb-[var(--space-xl)]">
        <div className="flex flex-col lg:flex-row items-start gap-[var(--space-lg)]">
          {/* Sidebar Filters */}
          <Suspense
            fallback={
              <aside className="w-full lg:w-[280px] flex-shrink-0 space-y-[var(--space-md)] lg:sticky lg:top-16">
                <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm h-40 animate-pulse" />
                <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-md)] shadow-sm h-32 animate-pulse" />
              </aside>
            }
          >
            <CategoryFilterSidebar
              brands={facets}
              total={total}
            />
          </Suspense>

          {/* Catalog Right Pane */}
          <main className="flex-1 w-full space-y-[var(--space-md)]">
            {/* Top Controls Bar */}
            <div className="bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-xs)] sm:p-[var(--space-md)] shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[var(--space-sm)]">
              <div className="flex items-center gap-[var(--space-sm)]">
                <span className="type-label-sm text-[var(--color-on-surface)] font-bold">
                  Showing {items.length} of {total} products
                </span>
                <span className="hidden sm:inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-outline-variant)]"></span>
                <span className="hidden sm:inline-block type-caption-micro text-[var(--color-on-surface-variant)]">
                  Delivering to <strong className="text-[var(--color-on-surface)]">Mumbai 400001</strong>
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-[var(--space-sm)]">
                {/* Sort Selector Dropdown */}
                <div className="relative flex items-center">
                  <label
                    htmlFor="catalog-sort"
                    className="type-caption-micro text-[var(--color-on-surface-variant)] mr-2 hidden md:inline"
                  >
                    Sort by:
                  </label>
                  <SortSelect
                    current={sort}
                    basePath={`/category/${categorySlug}`}
                    params={{
                      ...(brand.length ? { brand: brand.join(",") } : {}),
                      ...(minPrice ? { min: minPrice } : {}),
                      ...(maxPrice ? { max: maxPrice } : {}),
                      ...(minRating ? { rating: minRating } : {}),
                      ...(inStockOnly ? { stock: "1" } : {}),
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Product Grid */}
            <div id="product-grid">
              {items.length > 0 ? (
                <ProductGrid>
                  {items.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </ProductGrid>
              ) : (
                <EmptyState
                  title="No products found"
                  description="Try adjusting your filters or browse other categories."
                  action={
                    <Link
                      href="/products"
                      className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
                    >
                      Browse everything
                    </Link>
                  }
                />
              )}
            </div>

            {/* Catalog Bottom Controls & Pagination */}
            {brand.length <= 1 && current.pageCount > 1 && (
              <div className="mt-[var(--space-xl)] bg-[var(--color-surface-container-lowest)] rounded-xl p-[var(--space-lg)] shadow-sm flex flex-col items-center gap-[var(--space-md)] text-center">
                <div className="w-full max-w-md space-y-2">
                  <div className="flex items-center justify-between type-label-sm text-[var(--color-on-surface)]">
                    <span>Viewed {items.length} of {total} items</span>
                    <span className="font-bold text-[var(--color-primary)]">
                      {Math.round(((current.page - 1) * current.pageSize + items.length) / total * 100)}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-[var(--color-surface-container)] overflow-hidden">
                    <div
                      className="h-full bg-[var(--color-primary)] rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (current.page / current.pageCount) * 100)}%` }}
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-[var(--space-sm)] w-full justify-center">
                  {current.page < current.pageCount ? (
                    <Link
                      href={pageHref(current.page + 1)}
                      className="w-full sm:w-auto px-[var(--space-lg)] py-3 rounded-lg bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-primary)] type-label-md font-bold transition-all flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-lg" aria-hidden>expand_more</span>
                      <span>Load Next {Math.min(24, total - current.page * current.pageSize)} Products</span>
                    </Link>
                  ) : null}
                </div>
                <nav
                  aria-label="Pagination"
                  className="mt-4 flex items-center justify-center gap-4 text-sm"
                >
                  {current.page > 1 ? (
                    <Link
                      href={pageHref(current.page - 1)}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      ← Previous
                    </Link>
                  ) : null}
                  <span className="text-[var(--color-on-surface-variant)]">
                    Page {current.page} of {current.pageCount}
                  </span>
                  {current.page < current.pageCount ? (
                    <Link
                      href={pageHref(current.page + 1)}
                      className="font-medium text-[var(--color-primary)] hover:underline"
                    >
                      Next →
                    </Link>
                  ) : null}
                </nav>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
