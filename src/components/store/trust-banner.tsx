import type { LucideIcon } from "lucide-react";
import { BadgeCheck, Leaf, RotateCcw, Shirt } from "lucide-react";
import { Reveal } from "@/components/animated";
import { SectionHeading, SpatialSection } from "@/components/spatial";

const TRUST_ITEMS: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: BadgeCheck,
    title: "100% Authentic Guaranteed",
    body: "Certified origin tracking with zero tolerance for grey-market counterfeits.",
  },
  {
    icon: Shirt,
    title: "Doorstep Try & Buy",
    body: "Test fits and textures right at your doorstep before finalizing payment in 22 cities.",
  },
  {
    icon: RotateCcw,
    title: "7-Day Express Returns",
    body: "Hassle-free automated pickups with instant refunds transferred directly to source.",
  },
  {
    icon: Leaf,
    title: "Carbon-Neutral Delivery",
    body: "100% recyclable plastic-free paper packaging with EV fleet routing.",
  },
];

export function TrustBanner() {
  return (
    <SpatialSection spacing="tight" surface="glass-surface">
      <SectionHeading
        as="h2"
        eyebrow="Why Loop Studio"
        title="Built on trust, delivered with care"
        animated={false}
        className="mb-6 sm:mb-8"
      />
      <ul className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {TRUST_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <Reveal
              as="li"
              key={item.title}
              variant="up"
              delay={index * 80}
              className="flex items-start gap-3.5"
            >
              <div className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-tile)] border border-[var(--glass-line)] bg-[var(--glass-fill)] text-[var(--color-foreground)] backdrop-blur-md">
                <Icon aria-hidden className="size-5" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold tracking-tight text-[var(--color-foreground)]">
                  {item.title}
                </h3>
                <p className="mt-1 text-[13px] leading-relaxed text-[var(--color-muted-foreground)]">
                  {item.body}
                </p>
              </div>
            </Reveal>
          );
        })}
      </ul>
    </SpatialSection>
  );
}
