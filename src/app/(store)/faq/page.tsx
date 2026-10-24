import type { Metadata } from "next";
import { HelpCta, StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "FAQ",
  description: "Answers to common questions about orders, shipping, returns and payments.",
};

const SECTIONS = [
  {
    heading: "Orders & payment",
    paragraphs: [
      "All prices at checkout are exactly the prices shown on the product page — we never adjust a total between the cart and the payment step.",
    ],
    bullets: [
      "You can pay by UPI, card, netbanking or wallet through our payment provider.",
      "Cash on delivery is available on eligible pincodes and is marked clearly at checkout.",
      "If a payment fails, no money is captured. You can retry safely; the order stays in payment_failed until a payment succeeds.",
    ],
  },
  {
    heading: "Shipping",
    bullets: [
      "Orders are dispatched within 24 hours on business days.",
      "Shipping is free on orders above ₹499; below that a flat fee is shown before you pay.",
      "You will receive a tracking reference once the order moves to shipped.",
    ],
  },
  {
    heading: "Returns & refunds",
    bullets: [
      "Return requests are accepted within 7 days of delivery.",
      "Items must be unused, with tags and original packaging intact.",
      "Once a returned item reaches our facility, refunds are issued to the original payment method within 5–7 business days.",
    ],
  },
  {
    heading: "Pricing",
    bullets: [
      "The store applies a fixed markup — 8%, 9% or 10%, defaulting to 9% — over the source price.",
      "Prices are rounded up to the nearest rupee, never down.",
      "If a source price changes after your purchase, your order total is unaffected.",
    ],
  },
  {
    heading: "Account & privacy",
    bullets: [
      "You can shop as a guest; signing in simply carries your cart and wishlist across devices.",
      "We store only the profile details required to fulfil orders.",
      "You can request deletion of your account data at any time via the contact page.",
    ],
  },
];

export default function FaqPage() {
  return (
    <StaticPage
      title="Frequently asked questions"
      intro="The things people ask most before placing an order. If something is missing, we are one message away."
      sections={SECTIONS}
      aside={<HelpCta />}
    />
  );
}
