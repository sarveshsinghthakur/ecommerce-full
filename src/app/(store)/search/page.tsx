import type { Metadata } from "next";
import Link from "next/link";
import { SearchX } from "lucide-react";
import { searchProducts, suggestProducts } from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { EmptyState } from "@/components/ui/feedback";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Search",
  robots: { index: false, follow: true },
};

interface Params {
  searchParams: Promise<{ q?: string }>;
}

export default async function SearchPage({ searchParams }: Params) {
  const sp = await searchParams;
  const rawQuery = (sp.q ?? "").slice(0, 120);
  const query = rawQuery.trim();

  if (!query) {
    return (
      <div className="container-page py-16">
        <EmptyState
          icon={<SearchX />}
          title="Search Aurora"
          description="Type a product name, brand, or keyword in the search bar above to get started."
          action={
            <Link
              href="/products"
              className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Browse all products
            </Link>
          }
        />
      </div>
    );
  }

  const [results, suggestions] = await Promise.all([
    searchProducts(query, { limit: 48 }),
    suggestProducts(query, 6),
  ]);

  return (
    <div className="container-page py-8 sm:py-10">
      <h1 className="text-xl font-semibold tracking-tight text-[var(--color-foreground)] sm:text-2xl">
        Results for “<span className="text-[var(--color-primary)]">{query}</span>”
      </h1>
      <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
        {results.total} match{results.total === 1 ? "" : "es"}
      </p>

      {results.items.length > 0 ? (
        <>
          <ProductGrid className="mt-6">
            {results.items.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>

          {suggestions.length > 0 ? (
            <p className="mt-8 text-sm text-[var(--color-muted-foreground)]">
              Related searches:{" "}
              {suggestions.map((item, index) => (
                <span key={item.id}>
                  {index > 0 ? ", " : ""}
                  <Link
                    href={`/search?q=${encodeURIComponent(item.title)}`}
                    className="text-[var(--color-primary)] hover:underline"
                  >
                    {item.title}
                  </Link>
                </span>
              ))}
            </p>
          ) : null}
        </>
      ) : (
        <EmptyState
          className="mt-6"
          title={`Nothing matched “${query}”`}
          description="Check the spelling, try a shorter keyword, or browse the catalogue by category."
          action={
            <div className="mt-1 flex flex-wrap justify-center gap-2">
              <Link
                href="/products"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Browse products
              </Link>
              <Link
                href="/categories"
                className="inline-flex h-9 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-4 text-sm font-medium text-[var(--color-foreground)] hover:bg-white"
              >
                View categories
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}
