import type { Metadata } from "next";
import { StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "Shipping policy",
  description: "Dispatch times, delivery estimates, charges and tracking.",
};

export default function ShippingPolicyPage() {
  return (
    <StaticPage
      title="Shipping policy"
      intro="How and when your Aurora order leaves our facility and reaches you."
      updated="18 October 2026"
      sections={[
        {
          heading: "Processing time",
          paragraphs: [
            "Orders placed before 2:00 PM IST on a business day are normally dispatched the same day. Orders placed later, or on weekends and public holidays, are dispatched on the next business day.",
          ],
        },
        {
          heading: "Delivery estimates",
          bullets: [
            "Metro cities: 2–4 business days after dispatch.",
            "Tier 2 and 3 towns: 4–7 business days after dispatch.",
            "Remote pincodes: 7–10 business days after dispatch.",
            "Estimates start from the dispatch date, not the order date, and are indicative rather than guaranteed.",
          ],
        },
        {
          heading: "Shipping charges",
          bullets: [
            "Free shipping on orders of ₹499 and above.",
            "Below ₹499, a flat fee of ₹49 is added and shown before payment.",
            "Any expedited option and its cost are displayed at checkout before you confirm the order.",
          ],
        },
        {
          heading: "Tracking and delivery",
          paragraphs: [
            "A tracking reference is emailed once your order moves to shipped and is always visible under Orders in your account. Delivery requires a signature or OTP confirmation where the courier supports it.",
          ],
        },
        {
          heading: "Failed delivery",
          paragraphs: [
            "If delivery fails because the address was incomplete or the recipient was unavailable, the courier will attempt again. After the final attempt the parcel returns to us, and we will contact you to arrange a reship or a refund.",
          ],
        },
      ]}
    />
  );
}
