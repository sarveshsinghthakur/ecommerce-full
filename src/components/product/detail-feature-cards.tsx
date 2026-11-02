import { Reveal } from "@/components/animated";
import { SectionHeading, SpatialSection } from "@/components/spatial";
import type { ProductDetail } from "@/server/catalog";

/** Splits a stored description into readable paragraphs, dropping empties. */
function toParagraphs(description: string | null | undefined): string[] {
  if (!description) return [];
  return description
    .split(/\r?\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * "About this item" — an editorial band built from the product's real
 * stored description.
 *
 * This component previously rendered a fixed set of headphone
 * specifications (40mm titanium drivers, 65-hour battery, LDAC) that were
 * shown identically on every product page regardless of what was being
 * sold. It now renders only what the catalogue actually contains, and
 * disappears entirely for products without a description.
 */
export function ProductFeatureCards({ product }: { product: ProductDetail }) {
  const paragraphs = toParagraphs(product.description);
  if (paragraphs.length === 0) return null;

  const facts = [
    product.brand ? { label: "Brand", value: product.brand } : null,
    product.category
      ? { label: "Category", value: product.category.name }
      : null,
    product.rating
      ? { label: "Rated", value: `${Number(product.rating).toFixed(1)} / 5` }
      : null,
  ].filter(Boolean) as { label: string; value: string }[];

  return (
    <SpatialSection
      spacing="loose"
      surface="glass-surface"
      aria-labelledby="about-heading"
    >
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 lg:gap-10">
        <div className="lg:col-span-5">
          <SectionHeading
            id="about-heading"
            eyebrow="About this item"
            title={product.title}
            description={
              facts.length
                ? undefined
                : "Details supplied by the merchant."
            }
          />

          {facts.length ? (
            <dl className="mt-6 flex flex-col divide-y divide-[var(--glass-line)] rounded-[var(--radius-panel)] border border-[var(--glass-line)] bg-[var(--glass-fill-soft)] backdrop-blur-md">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="flex items-baseline justify-between gap-4 px-4 py-3"
                >
                  <dt className="text-xs uppercase tracking-[0.12em] text-[var(--color-muted-foreground)]">
                    {fact.label}
                  </dt>
                  <dd className="truncate text-sm font-medium text-[var(--color-foreground)]">
                    {fact.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        <div className="lg:col-span-7">
          <div className="glass-inset relative rounded-[var(--radius-panel)] p-6 sm:p-8">
            <span
              aria-hidden
              className="glass-sheen pointer-events-none absolute inset-0 rounded-[var(--radius-panel)]"
            />
            <div className="relative flex flex-col gap-4">
              {paragraphs.map((paragraph, index) => (
                <Reveal key={index} variant="up" delay={index * 80}>
                  <p className="text-[15px] leading-relaxed text-[var(--color-foreground)]/90">
                    {paragraph}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </SpatialSection>
  );
}
