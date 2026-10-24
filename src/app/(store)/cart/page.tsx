import type { Metadata } from "next";
import { CartPage } from "@/components/store/cart-page";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Aurora cart before checkout.",
};

export default function CartRoute() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Your cart
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Quantities and prices are confirmed again on the checkout page.
        </p>
      </div>

      <CartPage />
    </div>
  );
}
