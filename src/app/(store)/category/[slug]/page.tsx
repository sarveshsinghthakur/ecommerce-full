import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategoryBySlug, listProducts } from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { SortSelect } from "@/components/store/sort-select";
import { EmptyState } from "@/components/ui/feedback";
import type { SortKey } from "@/server/catalog";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

const SORT_KEYS: SortKey[] = ["newest", "rating", "price_asc", "price_desc"];

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategoryBySlug(slug);
  if (!category) return { title: "Category not found" };
  return {
    title: category.name,
    description:
      category.description ??
      `Shop ${category.name} at Aurora Store — transparent, markup-controlled pricing.`,
  };
}

export default async function CategoryPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ sort?: string; page?: string }> }) {
  const { slug } = await params;
  const sp = await searchParams;

  const category = await getCategoryBySlug(slug);
  if (!category || !category.isActive) notFound();

  const sort = SORT_KEYS.includes(sp.sort as SortKey) ? (sp.sort as SortKey) : "newest";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const current = await listProducts({
    categoryId: category.id,
    sort,
    page,
    pageSize: 24,
  });

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
          <li>
            <Link href="/categories" className="hover:text-[var(--color-foreground)]">
              Categories
            </Link>
          </li>
          <li aria-hidden>/</li>
          <li className="font-medium text-[var(--color-foreground)]">{category.name}</li>
        </ol>
      </nav>

      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          {category.name}
        </h1>
        {category.description ? (
          <p className="mt-1 max-w-2xl text-sm text-[var(--color-muted-foreground)]">
            {category.description}
          </p>
        ) : null}
      </div>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-muted-foreground)]">
          {current.total} product{current.total === 1 ? "" : "s"}
        </p>
        <SortSelect current={sort} basePath={`/category/${category.slug}`} params={{}} />
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
              className="mt-8 flex items-center justify-center gap-4 text-sm"
            >
              {current.page > 1 ? (
                <Link
                  href={`/category/${category.slug}?page=${current.page - 1}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  ← Previous
                </Link>
              ) : null}
              <span className="text-[var(--color-muted-foreground)]">
                Page {current.page} of {current.pageCount}
              </span>
              {current.page < current.pageCount ? (
                <Link
                  href={`/category/${category.slug}?page=${current.page + 1}${sort !== "newest" ? `&sort=${sort}` : ""}`}
                  className="font-medium text-[var(--color-primary)] hover:underline"
                >
                  Next →
                </Link>
              ) : null}
            </nav>
          ) : null}
        </>
      ) : (
        <EmptyState
          title="Nothing in this category yet"
          description="New arrivals are being added as imports are reviewed and published."
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
  );
}
