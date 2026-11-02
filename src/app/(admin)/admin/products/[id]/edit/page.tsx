import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/admin/product-form";
import { adminGetProduct, adminListCategories } from "@/server/admin-products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit product",
  robots: { index: false, follow: false },
};

export default async function AdminEditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [product, categories] = await Promise.all([
    adminGetProduct(id),
    adminListCategories(),
  ]);
  if (!product) notFound();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Edit product"
        description={`Editing “${product.title}” — changes apply to the storefront as soon as you save.`}
      />
      <ProductForm
        categories={categories}
        initial={{
          id: product.id,
          title: product.title,
          brand: product.brand ?? undefined,
          description: product.description ?? undefined,
          categoryId: product.categoryId ?? undefined,
          sourcePrice: product.sourcePrice ?? undefined,
          markupPercent: Number(product.markupPercent),
          sellingPriceOverride: product.priceOverride ? product.sellingPrice ?? undefined : undefined,
          referencePrice: product.referencePrice ?? undefined,
          stockQuantity: product.stockQuantity?.toString() ?? undefined,
          availability: product.availability,
          status: product.status,
          rating: product.rating ? Number(product.rating) : undefined,
          reviewCount: product.reviewCount,
          images: product.images.map((img) => img.url),
          keywords: product.searchKeywords ?? undefined,
          seoTitle: product.seoTitle ?? undefined,
          seoDescription: product.seoDescription ?? undefined,
        }}
      />
    </div>
  );
}
