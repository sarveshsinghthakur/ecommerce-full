import { PageHeader } from "@/components/ui/card";
import { ProductForm } from "@/components/admin/product-form";
import { adminListCategories } from "@/server/admin-products";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Add product",
  robots: { index: false, follow: false },
};

export default async function AdminNewProductPage() {
  const categories = await adminListCategories();

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title="Add product"
        description="Paste a product link (Meesho, Flipkart, Shopify stores, brand sites…) to import its details, or fill the form manually."
      />
      <ProductForm categories={categories} />
    </div>
  );
}
