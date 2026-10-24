import type { Metadata } from "next";
import { HelpCta, StaticPage } from "@/components/store/static-page";

export const metadata: Metadata = {
  title: "About",
  description:
    "How Aurora sources, verifies and prices its catalogue — and why the markup is published.",
};

export default function AboutPage() {
  return (
    <StaticPage
      title="About Aurora"
      intro="Aurora is a curated storefront that sources everyday essentials from established marketplaces, verifies every listing against its source, and sells them at a published, fixed markup."
      sections={[
        {
          heading: "Why we publish the markup",
          paragraphs: [
            "Most marketplaces hide how much of a price is margin. We do the opposite: every product page shows the source cost, the markup percentage we applied, and the final price you pay.",
            "The default markup is 9% and is capped at 10%. It is applied once, to the source price, and never compounded on re-imports or price updates.",
          ],
        },
        {
          heading: "How a product reaches the shelf",
          bullets: [
            "A listing URL is submitted and fetched through a marketplace adapter.",
            "The adapter normalises the raw payload into one canonical product shape — anything that cannot be verified stays empty rather than guessed.",
            "The pricing engine applies the configured markup and rounds the result up to the nearest rupee.",
            "An administrator reviews the normalised record and publishes it, or sends it back with notes.",
          ],
        },
        {
          heading: "What we promise",
          bullets: [
            "Prices shown on the shelf are the prices charged at checkout.",
            "Historic order totals are never recalculated when a source price later changes.",
            "Manual price overrides are recorded and flagged, never silently merged.",
            "Order line items are written as immutable snapshots at purchase time.",
          ],
        },
        {
          heading: "Where we operate",
          paragraphs: [
            "We currently ship across India with dispatch from our fulfilment partners within 24 hours of order confirmation. International shipping is not available yet.",
          ],
        },
      ]}
      aside={<HelpCta />}
    />
  );
}
