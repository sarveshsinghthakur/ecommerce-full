import type { Metadata } from "next";
import { StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "Terms & conditions",
  description: "The terms that govern shopping with Aurora Store.",
};

export default function TermsPage() {
  return (
    <StaticPage
      title="Terms & conditions"
      intro="These terms govern your use of Aurora Store. Placing an order means you accept them."
      updated="18 October 2026"
      sections={[
        {
          heading: "1. The store",
          paragraphs: [
            "Aurora Store is an independent retailer. Product information is sourced from public marketplace listings, normalised into our catalogue, and reviewed by an administrator before publication.",
          ],
        },
        {
          heading: "2. Pricing",
          bullets: [
            "Prices are the source price plus a published store markup of 8% to 10% (default 9%), rounded up to the nearest currency unit.",
            "The price displayed on the product page is the price charged at checkout. We do not add fees between cart and payment.",
            "If a source price changes after you order, your order total does not change.",
            "We may correct obvious pricing errors before dispatch; if that happens we will contact you and you may cancel for a full refund.",
          ],
        },
        {
          heading: "3. Orders",
          bullets: [
            "An order is an offer to buy. A contract is formed when we confirm it, not when payment is initiated.",
            "We may decline an order where stock is unavailable, the address cannot be served, or a pricing error is evident — with any payment already taken refunded in full.",
          ],
        },
        {
          heading: "4. Delivery",
          paragraphs: [
            "Delivery estimates are guidance, not guarantees. Risk passes to you on delivery to the address you provided. Title passes on full payment.",
          ],
        },
        {
          heading: "5. Returns",
          paragraphs: [
            "Returns are governed by our Returns & Refunds policy, which forms part of these terms. Nothing here limits your statutory rights under applicable consumer protection law.",
          ],
        },
        {
          heading: "6. Acceptable use",
          bullets: [
            "No automated scraping of the storefront beyond publicly available product pages at reasonable rates.",
            "No attempt to access the admin area, manipulate pricing, or interfere with the service.",
            "Accounts used for abusive activity may be suspended.",
          ],
        },
        {
          heading: "7. Liability",
          paragraphs: [
            "To the maximum extent permitted by law, our liability for any claim arising from an order is limited to the amount you paid for that order. We are not liable for indirect or consequential losses. Nothing in these terms excludes liability that cannot be excluded by law.",
          ],
        },
        {
          heading: "8. Changes",
          paragraphs: [
            "We may update these terms; the revision date above shows when they last changed. Changes apply from publication and do not affect orders already confirmed.",
          ],
        },
      ]}
    />
  );
}
