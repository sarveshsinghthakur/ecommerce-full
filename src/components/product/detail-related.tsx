import type { ProductCard as ProductSummary } from "@/server/catalog";
import { ProductCard, ProductGrid } from "@/components/product/product-card";
import { SectionHeading } from "@/components/spatial";

interface ProductRelatedProps {
  products: ProductSummary[];
}

/**
 * "You might also like" rail. Delegates to the shared <ProductCard> so the
 * card here has the same working add-to-cart and wishlist actions as the
 * listing pages — the previous version rendered its own markup with an
 * "Add" button that had no onClick handler.
 */
export function ProductRelated({ products }: ProductRelatedProps) {
  if (!products || products.length === 0) return null;

  return (
    <section aria-labelledby="related-heading">
      <SectionHeading
        id="related-heading"
        eyebrow="Similar recommendations"
        title="You might also like"
      />
      <ProductGrid className="mt-6">
        {products.map((item) => (
          <ProductCard key={item.id} product={item} />
        ))}
      </ProductGrid>
    </section>
  );
}
