import type { Metadata } from "next";
import Link from "next/link";
import { listCategories } from "@/server/catalog";
import { EmptyState } from "@/components/ui/feedback";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse every product category available at Aurora Store.",
};

export default async function CategoriesPage() {
  const categories = await listCategories();

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Categories
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {categories.length} categor{categories.length === 1 ? "y" : "ies"} available
        </p>
      </div>

      {categories.length === 0 ? (
        <EmptyState
          title="No categories yet"
          description="Categories appear once products have been imported and mapped from the admin area."
          action={
            <Link
              href="/products"
              className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Browse all products
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories.map((category) => (
            <Link
              key={category.id}
              href={`/category/${category.slug}`}
              className="group overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white transition-shadow hover:shadow-[var(--shadow-card)]"
            >
              <div className="aspect-[16/9] overflow-hidden bg-[var(--color-muted)]">
                {category.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={category.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="grid size-full place-items-center text-xs text-[var(--color-muted-foreground)]">
                    No image
                  </div>
                )}
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    {category.name}
                  </h2>
                  <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                    {category.productCount}
                  </span>
                </div>
                {category.description ? (
                  <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">
                    {category.description}
                  </p>
                ) : null}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
