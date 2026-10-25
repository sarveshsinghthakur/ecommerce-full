import Link from "next/link";
import { ArrowRight, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import {
  listCategories,
  listFeaturedProducts,
  listLatestProducts,
} from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";

const perks = [
  {
    icon: Truck,
    title: "Fast delivery",
    body: "Dispatched within 24 hours across the country.",
  },
  {
    icon: RefreshCcw,
    title: "7-day returns",
    body: "Changed your mind? Send it back, no drama.",
  },
  {
    icon: ShieldCheck,
    title: "Verified sourcing",
    body: "Every listing is re-checked against its source before it ships.",
  },
];

export default async function HomePage() {
  const [featured, latest, categories] = await Promise.all([
    listFeaturedProducts(8),
    listLatestProducts(4),
    listCategories(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-[var(--color-border)] bg-[linear-gradient(180deg,#eef2ff_0%,#ffffff_100%)]">
        <div className="container-page flex flex-col gap-8 py-14 sm:py-20 lg:flex-row lg:items-center lg:gap-16">
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full border border-[var(--color-primary-soft)] bg-white px-3 py-1 text-xs font-medium text-[var(--color-primary)]">
              Transparent pricing · 8–10% store markup
            </span>
            <h1 className="mt-4 text-balance text-3xl font-semibold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-4xl lg:text-5xl">
              Everyday essentials, priced without surprises.
            </h1>
            <p className="mt-4 text-balance text-base leading-relaxed text-[var(--color-muted-foreground)] sm:text-lg">
              Aurora sources from trusted marketplaces, verifies every listing,
              and applies a fixed, published markup — so what you see is what
              you pay.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/products"
                className="inline-flex h-11 items-center gap-2 rounded-[var(--radius-control)] bg-[var(--color-primary)] px-5 text-sm font-medium text-white transition-colors hover:bg-[var(--color-primary-hover)]"
              >
                Shop all products
                <ArrowRight className="size-4" aria-hidden />
              </Link>
              <Link
                href="/categories"
                className="inline-flex h-11 items-center rounded-[var(--radius-control)] border border-[var(--color-border-strong)] bg-white px-5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
              >
                Browse categories
              </Link>
            </div>
          </div>

          <div className="grid flex-1 grid-cols-3 gap-3 sm:gap-4">
            {featured.slice(0, 3).map((product) => (
              <Link
                key={product.id}
                href={`/product/${product.slug}`}
                className="overflow-hidden rounded-[var(--radius-card)] border border-white/70 bg-white shadow-[var(--shadow-card)] transition-transform hover:-translate-y-1"
              >
                <div className="aspect-square bg-[var(--color-muted)]">
                  {product.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.imageUrl}
                      alt={product.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-3">
                  <p className="line-clamp-1 text-xs font-medium text-[var(--color-foreground)]">
                    {product.title}
                  </p>
                  <p className="mt-1 text-sm font-semibold tabular-nums text-[var(--color-foreground)]">
                    {formatMoney(product.sellingPrice, product.currency)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 ? (
        <section className="container-page py-12 sm:py-16">
          <SectionHeading
            title="Shop by category"
            href="/categories"
            linkLabel="All categories"
          />
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.slice(0, 6).map((category) => (
              <Link
                key={category.id}
                href={`/category/${category.slug}`}
                className="group flex flex-col justify-between rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)] p-4 transition-colors hover:border-[var(--color-border-strong)] hover:bg-white"
              >
                <div className="aspect-[4/3] overflow-hidden rounded-md bg-white">
                  {category.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={category.imageUrl}
                      alt={category.name}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : (
                    <div className="size-full" />
                  )}
                </div>
                <div className="mt-3">
                  <p className="text-sm font-medium text-[var(--color-foreground)] group-hover:text-[var(--color-primary)]">
                    {category.name}
                  </p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">
                    {category.productCount} item
                    {category.productCount === 1 ? "" : "s"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {/* Featured */}
      <section className="container-page py-12 sm:py-16">
        <SectionHeading
          title="Featured this week"
          href="/products?sort=rating"
          linkLabel="View all"
        />
        {featured.length > 0 ? (
          <ProductGrid className="mt-6">
            {featured.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        ) : (
          <EmptyShelf
            title="The shelves are being stocked"
            description="Products will appear here as soon as the first import is reviewed and published from the admin area."
            action={
              <Link
                href="/admin"
                className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Open admin
              </Link>
            }
          />
        )}
      </section>

      {/* Perks */}
      <section className="border-y border-[var(--color-border)] bg-[var(--color-muted)]">
        <div className="container-page grid gap-6 py-10 sm:grid-cols-3">
          {perks.map((perk) => (
            <div key={perk.title} className="flex items-start gap-3">
              <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-white text-[var(--color-primary)]">
                <perk.icon className="size-4" aria-hidden />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--color-foreground)]">
                  {perk.title}
                </p>
                <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">
                  {perk.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* New arrivals */}
      {latest.length > 0 ? (
        <section className="container-page py-12 sm:py-16">
          <SectionHeading
            title="Just landed"
            href="/products?sort=newest"
            linkLabel="New arrivals"
          />
          <ProductGrid className="mt-6">
            {latest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ProductGrid>
        </section>
      ) : null}
    </div>
  );
}

function SectionHeading({
  title,
  href,
  linkLabel,
}: {
  title: string;
  href: string;
  linkLabel: string;
}) {
  return (
    <div className="flex items-end justify-between gap-4">
      <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)] sm:text-xl">
        {title}
      </h2>
      <Link
        href={href}
        className="shrink-0 text-sm font-medium text-[var(--color-primary)] hover:underline"
      >
        {linkLabel}
      </Link>
    </div>
  );
}

function EmptyShelf({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mt-6 rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] px-6 py-14 text-center">
      <p className="text-sm font-semibold text-[var(--color-foreground)]">{title}</p>
      <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--color-muted-foreground)]">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
