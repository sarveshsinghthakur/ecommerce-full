import {
  listCategories,
  listDealProducts,
  listFeaturedProducts,
  listProductsByPriceBand,
} from "@/server/catalog";
import type { ProductCard } from "@/server/catalog";
import { formatMoney } from "@/lib/money";
import { ProductCard as ProductCardView } from "@/components/product/product-card";
import { HeroCarousel } from "@/components/store/hero-carousel";
import { CategoryGrid } from "@/components/store/category-grid";
import { FlashDeals } from "@/components/store/deal-cards";
import {
  EditorialCollections,
  type EditorialCollection,
} from "@/components/store/editorial-collections";
import {
  BudgetSection,
  type BudgetCategory,
  type BudgetItem,
} from "@/components/store/budget-section";
import { TrustBanner } from "@/components/store/trust-banner";

export const dynamic = "force-dynamic";

function toBudgetItem(product: ProductCard): BudgetItem {
  const discounted =
    product.referencePrice !== null &&
    Number(product.referencePrice) > Number(product.sellingPrice);
  return {
    id: product.id,
    name: product.title,
    price: formatMoney(product.sellingPrice, product.currency, { showDecimals: false }),
    mrp: discounted
      ? formatMoney(product.referencePrice, product.currency, { showDecimals: false })
      : null,
    tag: product.rating ? `${Number(product.rating).toFixed(1)} ★` : "Popular",
    imageUrl: product.imageUrl,
  };
}

export default async function HomePage() {
  const [featured, categories, deals, under299, under499, under999, premium] =
    await Promise.all([
      listFeaturedProducts(8),
      listCategories(),
      listDealProducts(5),
      listProductsByPriceBand({ maxPrice: "299", limit: 4 }),
      listProductsByPriceBand({ maxPrice: "499", limit: 4 }),
      listProductsByPriceBand({ maxPrice: "999", limit: 4 }),
      listProductsByPriceBand({ minPrice: "1500", limit: 4 }),
    ]);

  const budgetCatalog: BudgetCategory[] = [
    { key: "299", label: "Under ₹299", items: under299.map(toBudgetItem) },
    { key: "499", label: "Under ₹499", items: under499.map(toBudgetItem) },
    { key: "999", label: "Under ₹999", items: under999.map(toBudgetItem) },
    { key: "premium", label: "Premium Studio", items: premium.map(toBudgetItem) },
  ].filter((band) => band.items.length > 0);

  const bySlug = new Map(categories.map((c) => [c.slug, c]));
  const collections: EditorialCollection[] = [
    {
      id: "essentials",
      badge: "Curated Pantry",
      badgeColor: "surface",
      title: "Everyday Essentials",
      description:
        "Stock up on premium pantry, laundry, and daily self-care staples.",
      cta: "Explore Essentials",
      ctaColor: "primary",
      imageUrl: bySlug.get("grocery-and-gourmet")?.imageUrl ?? null,
      imageAlt: "Grocery and gourmet everyday essentials",
      href: "/category/grocery-and-gourmet",
    },
    {
      id: "living",
      badge: "Modern Architecture",
      badgeColor: "surface",
      title: "Living & Decor",
      description:
        "Elevate your sanctum with sculptural lighting, rugs & ceramics.",
      cta: "Shop Home & Kitchen",
      ctaColor: "primary",
      imageUrl: bySlug.get("home-and-kitchen")?.imageUrl ?? null,
      imageAlt: "Home and kitchen living essentials",
      href: "/category/home-and-kitchen",
    },
    {
      id: "bazaar",
      badge: "Super Saver Hub",
      badgeColor: "tertiary",
      title: "Under ₹499 Bazaar",
      description:
        "Unmatched micro-budget finds with zero compromise on craftsmanship.",
      cta: "Dive into Bazaar",
      ctaColor: "tertiary",
      imageUrl: bySlug.get("electronics-and-accessories")?.imageUrl ?? null,
      imageAlt: "Affordable electronics and accessories",
      href: "/products?max=499",
    },
  ];

  const trendingChips = [
    { label: "All Trending", href: "/products?sort=rating" },
    ...categories.slice(0, 4).map((c) => ({
      label: c.name.split(" & ")[0],
      href: `/category/${c.slug}`,
    })),
  ];

  return (
    <div>
      {/* ------------------------------ Hero ------------------------------ */}
      <HeroCarousel />

      {/* --------------------------- Categories --------------------------- */}
      <CategoryGrid categories={categories.slice(0, 8).map((c) => ({
        id: c.id,
        name: c.name,
        itemCount: `${c.productCount} item${c.productCount === 1 ? "" : "s"}`,
        imageUrl: c.imageUrl ?? "/images/category-placeholder.svg",
        imageAlt: c.name,
        href: `/category/${c.slug}`,
      }))} />

      {/* --------------------------- Flash Deals -------------------------- */}
      <FlashDeals products={deals.items} totalDeals={deals.total} />

      {/* ------------------- Editorial Discovery Collections -------------- */}
      <EditorialCollections collections={collections} />

      {/* --------------------------- Bestsellers -------------------------- */}
      <section className="max-w-[1440px] mx-auto w-full px-[var(--gutter-sm)] lg:px-0 py-[var(--space-lg)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-[var(--space-sm)] mb-[var(--space-lg)]">
          <div>
            <h2 className="type-headline-md text-[var(--color-on-surface)]">
              Bestsellers &amp; Trending Now
            </h2>
            <p className="type-body-sm text-[var(--color-on-surface-variant)]">
              Top-rated goods dominating cart additions across India this week
            </p>
          </div>
          <nav
            aria-label="Trending categories"
            className="flex items-center gap-[var(--space-xs)] overflow-x-auto py-1 no-scrollbar"
          >
            {trendingChips.map((chip, index) => (
              <a
                key={chip.href}
                href={chip.href}
                className={
                  index === 0
                    ? "px-3.5 py-1.5 rounded-full bg-[var(--color-on-surface)] text-[var(--color-surface-container-lowest)] type-label-sm shadow-sm shrink-0"
                    : "px-3.5 py-1.5 rounded-full bg-[var(--color-surface-container)] hover:bg-[var(--color-surface-container-high)] text-[var(--color-on-surface)] type-label-sm transition-colors shrink-0"
                }
              >
                {chip.label}
              </a>
            ))}
          </nav>
        </div>

        {featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[var(--gutter-sm)]">
            {featured.map((product) => (
              <ProductCardView key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-xl border border-dashed border-[var(--color-border-strong)] bg-[var(--color-muted)] px-6 py-14 text-center">
            <p className="text-sm font-semibold text-[var(--color-on-surface)]">
              The shelves are being stocked
            </p>
            <p className="mx-auto mt-1 max-w-lg text-sm text-[var(--color-on-surface-variant)]">
              Products appear here as soon as the first import is reviewed and published from the admin area.
            </p>
          </div>
        )}
      </section>

      {/* --------------------------- Shop by Budget -------------------------- */}
      <BudgetSection catalog={budgetCatalog} />

      {/* --------------------------- Trust Banner ---------------------------- */}
      <TrustBanner />
    </div>
  );
}
