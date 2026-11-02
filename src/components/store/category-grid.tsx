"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { Reveal } from "@/components/animated";
import { SectionHeading, SpatialSection } from "@/components/spatial";

export interface CategoryCardItem {
  id: string;
  name: string;
  itemCount: string;
  imageUrl: string;
  imageAlt: string;
  href: string;
}

/**
 * Renders the "Explore Departments" row. Categories are supplied by the page
 * from the catalogue (hrefs are built from real slugs), so this component
 * holds no link data of its own — a hardcoded default once pointed at a set
 * of slugs that no longer matched the database and 404'd.
 */
export function CategoryGrid({
  categories,
  totalCategories,
}: {
  categories: CategoryCardItem[];
  /** Total number of catalogue categories, for the "All N Categories" link. */
  totalCategories?: number;
}) {
  if (categories.length === 0) return null;

  return (
    <SpatialSection id="departments" spacing="normal">
      <SectionHeading
        title="Explore Departments"
        description="Hand-picked products certified for direct home delivery"
        action={
          <Link
            href="/categories"
            className="group inline-flex items-center gap-1.5 rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill)] px-4 py-2 text-sm font-medium text-[var(--color-foreground)] backdrop-blur-md transition-[background-color,border-color,transform] duration-[var(--dur-base)] hover:-translate-y-px hover:bg-[var(--glass-fill-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
          >
            {typeof totalCategories === "number"
              ? `All ${totalCategories} Categories`
              : "All Categories"}
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-[var(--dur-base)] group-hover:translate-x-0.5"
            />
          </Link>
        }
      />

      <ul className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {categories.map((cat, index) => (
          <Reveal
            as="li"
            key={cat.id}
            variant="up"
            delay={index * 45}
            className="h-full"
          >
            <Link
              href={cat.href}
              className="group flex h-full flex-col items-center gap-2.5 rounded-[var(--radius-tile)] border border-[var(--glass-line)] bg-[var(--glass-fill)] p-3 text-center backdrop-blur-md transition-[transform,border-color,background-color,box-shadow] duration-[var(--dur-base)] ease-[var(--ease-spatial)] hover:-translate-y-1 hover:border-[var(--glass-ring)] hover:bg-[var(--glass-fill-strong)] hover:shadow-[var(--spatial-2)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)] motion-reduce:hover:translate-y-0"
            >
              <div className="relative size-16 shrink-0 overflow-hidden rounded-full border border-[var(--glass-line)] bg-[var(--glass-fill-soft)] p-1 transition-transform duration-[var(--dur-base)] group-hover:scale-105 motion-reduce:group-hover:scale-100">
                <ImageWithFallback
                  src={cat.imageUrl}
                  alt={cat.imageAlt}
                  loading="lazy"
                  fallbackSrc="/images/category-placeholder.svg"
                  className="size-full rounded-full object-cover"
                />
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-white/25 via-transparent to-transparent"
                />
              </div>
              <span className="line-clamp-2 text-[13px] font-medium leading-snug text-[var(--color-foreground)] transition-colors duration-[var(--dur-fast)] group-hover:text-[var(--color-accent)]">
                {cat.name}
              </span>
              <span className="text-[11px] text-[var(--color-muted-foreground)]">
                {cat.itemCount}
              </span>
            </Link>
          </Reveal>
        ))}
      </ul>
    </SpatialSection>
  );
}
