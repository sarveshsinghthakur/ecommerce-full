import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Star } from "lucide-react";
import { getProductBySlug, getRelatedProducts } from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { Price, discountPercent } from "@/components/ui/price";
import { Badge } from "@/components/ui/badge";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ slug: string }>;
}

const AVAILABILITY_LABEL: Record<string, string> = {
  in_stock: "In stock — dispatched within 24 hours.",
  out_of_stock: "Currently out of stock.",
  preorder: "Available for pre-order.",
  unknown: "Stock availability is being confirmed with the supplier.",
};

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: "Product not found" };
  return {
    title: product.seoTitle ?? product.title,
    description:
      product.seoDescription ??
      product.description?.slice(0, 160) ??
      `${product.title}${product.brand ? ` by ${product.brand}` : ""} at Aurora Store.`,
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

  return (
    <div className="container-page py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-5 text-sm text-[var(--color-muted-foreground)]">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li>
            <Link href="/" className="hover:text-[var(--color-foreground)]">
              Home
            </Link>
          </li>
          <li aria-hidden>
            <ChevronRight className="size-3.5" aria-hidden />
          </li>
          <li>
            <Link href="/products" className="hover:text-[var(--color-foreground)]">
              Products
            </Link>
          </li>
          {product.category ? (
            <>
              <li aria-hidden>
                <ChevronRight className="size-3.5" aria-hidden />
              </li>
              <li>
                <Link
                  href={`/category/${product.category.slug}`}
                  className="hover:text-[var(--color-foreground)]"
                >
                  {product.category.name}
                </Link>
              </li>
            </>
          ) : null}
          <li aria-hidden>
            <ChevronRight className="size-3.5" aria-hidden />
          </li>
          <li className="truncate font-medium text-[var(--color-foreground)]">
            {product.title}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <div className="space-y-3">
          <div className="aspect-square overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)]">
            {gallery[0] ? (
              <ImageWithFallback
                src={gallery[0].url}
                alt={gallery[0].alt ?? product.title}
                fallbackSrc="/images/product-placeholder.svg"
                referrerPolicy="no-referrer"
                className="size-full object-cover"
                fetchPriority="high"
              />
            ) : (
              <div className="grid size-full place-items-center text-sm text-[var(--color-muted-foreground)]">
                No image available
              </div>
            )}
          </div>

          {gallery.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {gallery.map((image) => (
                <div
                  key={image.id}
                  className="size-16 shrink-0 overflow-hidden rounded-md border border-[var(--color-border)] bg-white"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <ImageWithFallback
                    src={image.url}
                    alt={image.alt ?? product.title}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="size-full object-cover"
                  />
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-5">
          <div>
            {product.brand ? (
              <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
                {product.brand}
              </p>
            ) : null}
            <h1 className="mt-1.5 text-balance text-2xl font-semibold leading-tight tracking-tight text-[var(--color-foreground)] sm:text-3xl">
              {product.title}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {product.rating ? (
                <span className="inline-flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
                  <Star
                    className="size-4 fill-[var(--color-warning)] text-[var(--color-warning)]"
                    aria-hidden
                  />
                  <span className="font-medium text-[var(--color-foreground)]">
                    {Number(product.rating).toFixed(1)}
                  </span>
                  <span>· {product.reviewCount} review{product.reviewCount === 1 ? "" : "s"}</span>
                </span>
              ) : null}
              <Badge tone={available ? "success" : "danger"}>
                {available ? "In stock" : "Out of stock"}
              </Badge>
              {discount !== null ? <Badge tone="sale">Save {discount}%</Badge> : null}
            </div>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-muted)] p-4">
            <Price
              value={product.sellingPrice}
              compareAt={product.referencePrice}
              currency={product.currency}
              className="text-2xl"
            />
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-muted-foreground)]">
              Store price of{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {product.sourcePrice ? `₹${product.sourcePrice}` : "the source cost"}
              </span>
              {product.markupPercent
                ? ` plus a ${product.markupPercent}% Aurora markup`
                : ""}{" "}
              — rounded up to the nearest rupee. This exact price is what you pay
              at checkout.
            </p>
          </div>

          <PurchasePanel
            productId={product.id}
            available={available}
            availabilityLabel={
              AVAILABILITY_LABEL[product.availability] ?? "Availability unknown."
            }
          />

          {product.description ? (
            <section className="border-t border-[var(--color-border)] pt-5">
              <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
                Description
              </h2>
              <div className="mt-2 space-y-3 text-sm leading-relaxed whitespace-pre-line text-[var(--color-muted-foreground)]">
                {product.description}
              </div>
            </section>
          ) : null}

          <section className="border-t border-[var(--color-border)] pt-5 text-sm text-[var(--color-muted-foreground)]">
            <h2 className="mb-2 text-sm font-semibold text-[var(--color-foreground)]">
              Delivery & returns
            </h2>
            <ul className="space-y-1.5">
              <li>Dispatched within 24 hours of order confirmation.</li>
              <li>Free shipping above ₹499.</li>
              <li>
                7-day returns — see our{" "}
                <Link href="/returns-and-refunds" className="text-[var(--color-primary)] hover:underline">
                  returns policy
                </Link>
                .
              </li>
            </ul>
          </section>
        </div>
      </div>

      {related.length > 0 ? (
        <section className="mt-14 border-t border-[var(--color-border)] pt-10">
          <h2 className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
            You may also like
          </h2>
          <ProductGrid className="mt-5">
            {related.map((item) => (
              <ProductCard key={item.id} product={item} />
            ))}
          </ProductGrid>
        </section>
      ) : null}
    </div>
  );
}
