"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Reveal } from "@/components/animated";

export interface EditorialCollection {
  id: string;
  badge: string;
  badgeColor: "surface" | "tertiary";
  title: string;
  description: string;
  cta: string;
  ctaColor: "primary" | "tertiary";
  imageUrl: string | null;
  imageAlt: string;
  href: string;
}

/**
 * Three full-bleed editorial tiles. The whole card is a single link target
 * (previously the only anchor was the small "read more" text, leaving most of
 * the tile unclickable), with the CTA duplicated visually as the affordance.
 */
export function EditorialCollections({
  collections,
}: {
  collections: EditorialCollection[];
}) {
  if (collections.length === 0) return null;

  return (
    <section
      aria-label="Featured collections"
      className="mx-auto w-full max-w-[1440px] px-4 py-10 lg:px-8 lg:py-14"
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {collections.map((col, index) => (
          <Reveal
            key={col.id}
            variant="up"
            delay={index * 90}
            className="h-full"
          >
            <Link
              href={col.href}
              className="group relative flex h-full min-h-[320px] flex-col justify-between overflow-hidden rounded-[var(--radius-panel)] border border-[var(--glass-line)] bg-[var(--glass-fill-soft)] p-6 backdrop-blur-md transition-[transform,border-color,box-shadow] duration-[var(--dur-slow)] ease-[var(--ease-spatial)] hover:-translate-y-1 hover:border-[var(--glass-ring)] hover:shadow-[var(--spatial-3)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:hover:translate-y-0"
            >
              <div aria-hidden className="absolute inset-0">
                <ImageWithFallback
                  src={col.imageUrl ?? undefined}
                  alt={col.imageAlt}
                  loading="lazy"
                  fallbackSrc="/images/category-placeholder.svg"
                  className="absolute inset-0 h-full w-full scale-100 object-cover transition-transform duration-[var(--dur-slow)] ease-[var(--ease-spatial)] group-hover:scale-[1.06] motion-reduce:group-hover:scale-100"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/55 to-black/20" />
                <span className="glass-sheen absolute inset-0" />
              </div>

              <div className="relative z-10 flex justify-between items-start">
                <span
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] backdrop-blur-md",
                    col.badgeColor === "tertiary"
                      ? "border-white/25 bg-[var(--color-tertiary-container)]/85 text-[var(--color-on-tertiary-container)]"
                      : "border-white/25 bg-white/15 text-white",
                  )}
                >
                  {col.badge}
                </span>
              </div>

              <div className="relative z-10 text-white">
                <h3 className="text-balance text-2xl font-semibold leading-tight tracking-tight sm:text-[26px]">
                  {col.title}
                </h3>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-white/80">
                  {col.description}
                </p>
                <span
                  className={cn(
                    "mt-5 inline-flex items-center gap-1.5 text-sm font-semibold",
                    col.ctaColor === "tertiary"
                      ? "text-[var(--color-tertiary-fixed)]"
                      : "text-[var(--color-primary-fixed)]",
                  )}
                >
                  {col.cta}
                  <ArrowRight
                    aria-hidden
                    className="size-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-1 motion-reduce:group-hover:translate-x-0"
                  />
                </span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
