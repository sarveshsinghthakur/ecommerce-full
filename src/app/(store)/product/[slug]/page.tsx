import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, ShieldCheck } from "lucide-react";
import { notFound } from "next/navigation";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog";
import { discountPercent } from "@/components/ui/price";
import { ProductDetailBuyBox } from "@/components/product/detail-buy-box";
import { ProductMediaGallery } from "@/components/product/detail-media-gallery";
import { ProductSpecsTable } from "@/components/product/detail-specs-table";
import { ProductReviews } from "@/components/product/detail-reviews";
import { ProductRelated } from "@/components/product/detail-related";
import { ProductFeatureCards } from "@/components/product/detail-feature-cards";
import { ShareButton } from "@/components/product/share-button";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.title,
    description:
      product.seoDescription ??
      product.description?.slice(0, 160) ??
      `${product.title}${product.brand ? ` by ${product.brand}` : ""} at Loop Studio.`,
    openGraph: {
      type: "website",
      images: product.imageUrl ? [{ url: product.imageUrl }] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Params) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await getRelatedProducts(product, 4);
  const discount = discountPercent(product.sellingPrice, product.referencePrice);
  const available = product.availability !== "out_of_stock";
  const gallery = product.images.length
    ? product.images
    : product.imageUrl
      ? [{ id: "hero", url: product.imageUrl, alt: product.title, position: 0 }]
      : [];

  const crumbs = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    ...(product.category
      ? [
          {
            label: product.category.name,
            href: `/category/${product.category.slug}`,
          },
        ]
      : []),
  ];

  return (
    <div className="container-page py-6 sm:py-10">
      {/* Breadcrumb + assurance bar */}
      <div className="glass-inset flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-panel)] px-4 py-3">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-1.5 overflow-x-auto whitespace-nowrap text-xs"
        >
          {crumbs.map((crumb) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              <Link
                href={crumb.href}
                className="text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                {crumb.label}
              </Link>
              <ChevronRight aria-hidden className="size-3 opacity-50" />
            </span>
          ))}
          <span
            aria-current="page"
            className="truncate font-semibold text-[var(--color-foreground)]"
          >
            {product.title}
          </span>
        </nav>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden items-center gap-1.5 text-xs text-[var(--color-muted-foreground)] sm:inline-flex">
            <ShieldCheck aria-hidden className="size-4 text-[var(--color-accent)]" strokeWidth={1.75} />
            100% authentic
          </span>
          <ShareButton title={product.title} />
        </div>
      </div>

      {/* Gallery + buy box */}
      <section className="mt-6 grid w-full grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-7 lg:sticky lg:top-[calc(var(--header-h,6rem)+1rem)]">
          <ProductMediaGallery
            gallery={gallery}
            productId={product.id}
            productTitle={product.title}
            isBestseller={product.isBestseller}
          />
        </div>

        <div className="lg:col-span-5">
          <ProductDetailBuyBox
            product={product}
            discount={discount}
            available={available}
          />
        </div>
      </section>

      {/* Real description, when the merchant supplied one */}
      <ProductFeatureCards product={product} />

      {/* Specs + related items */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
        <ProductSpecsTable product={product} related={related} />
      </section>

      {/* Reviews */}
      <section className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14">
        <ProductReviews product={product} />
      </section>

      {/* Related */}
      <section className="mx-auto w-full max-w-[1440px] px-4 pb-16 lg:px-8">
        <ProductRelated products={related} />
      </section>
    </div>
  );
}
