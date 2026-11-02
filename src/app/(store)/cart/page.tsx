import type { Metadata } from "next";
import { CartPage } from "@/components/store/cart-page";
import { SectionLabel } from "@/components/ui/section-label";
import { Reveal, TextReveal } from "@/components/animated";

export const metadata: Metadata = {
  title: "Your cart",
  description: "Review the items in your Loop Studio cart before checkout.",
};

export default function CartRoute() {
  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <Reveal variant="left">
          <SectionLabel>Cart · review before checkout</SectionLabel>
        </Reveal>
        <TextReveal
          as="h1"
          className="mt-3 text-2xl font-semibold tracking-tight text-[var(--color-foreground)]"
          text="Your cart"
        />
        <Reveal delay={180}>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Quantities and prices are confirmed again on the checkout page.
          </p>
        </Reveal>
      </div>

      <CartPage />
    </div>
  );
}
