"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { ImageWithFallback } from "@/components/ui/image-with-fallback";
import { useReducedMotion } from "@/components/spatial";

export interface HeroSlide {
  id: string;
  label: string;
  title: string;
  description: string;
  offerText: string;
  icon: "card" | "tag" | "truck";
  primaryAction: string;
  primaryHref: string;
  secondaryAction: string;
  secondaryHref: string;
  imageUrl: string;
  imageAlt: string;
}

const DEFAULT_SLIDES: HeroSlide[] = [
  {
    id: "hero-slide-1",
    label: "Exclusive tech launch",
    title: "The Tech & Audio Fest",
    description:
      "Up to 60% off flagship noise-cancelling headphones, smart wearables and wireless power essentials.",
    offerText: "Instant ₹1,500 off on ICICI & HDFC bank cards",
    icon: "card",
    primaryAction: "Shop deals now",
    primaryHref: "/products?deals=1&sort=discount",
    secondaryAction: "Explore audio",
    secondaryHref: "/category/electronics-and-accessories",
    imageUrl: "/images/editorial/hero-1.jpg",
    imageAlt:
      "Matte graphite wireless over-ear noise-cancelling headphones beside a smartwatch on a reflective pedestal",
  },
  {
    id: "hero-slide-2",
    label: "Spring wardrobe",
    title: "Capsule Wardrobe Refresh",
    description:
      "Breathable linens, tailored cottons and everyday essentials, curated for the season ahead.",
    offerText: "Extra 10% off with code SPRING10",
    icon: "tag",
    primaryAction: "Shop wardrobe",
    primaryHref: "/category/fashion-and-apparel",
    secondaryAction: "Explore fashion",
    secondaryHref: "/products?sort=newest",
    imageUrl: "/images/editorial/hero-2.jpg",
    imageAlt: "Model in a relaxed beige linen shirt and crisp cotton garments",
  },
  {
    id: "hero-slide-3",
    label: "Smart home",
    title: "Home Innovation",
    description:
      "Robot vacuums, air purifiers and smart lighting for a calmer, better-running home.",
    offerText: "Free delivery on orders above ₹499",
    icon: "truck",
    primaryAction: "Shop smart home",
    primaryHref: "/category/home-and-kitchen",
    secondaryAction: "Explore devices",
    secondaryHref: "/products?sort=rating",
    imageUrl: "/images/editorial/hero-3.jpg",
    imageAlt: "Modern Scandinavian living room with robot vacuum and smart lighting",
  },
];

const AUTO_ADVANCE_MS = 7000;

const ICONS = {
  card: (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
      <rect x="2.75" y="5.25" width="18.5" height="13.5" rx="2.75" stroke="currentColor" strokeWidth="1.6" />
      <path d="M2.75 9.75h18.5" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
  tag: (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
      <path
        d="M4 4h6.6a2 2 0 0 1 1.42.59l7.4 7.4a2 2 0 0 1 0 2.82l-5.6 5.6a2 2 0 0 1-2.82 0l-7.4-7.4A2 2 0 0 1 4 11.6V4Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="8.5" cy="8.5" r="1.4" fill="currentColor" />
    </svg>
  ),
  truck: (
    <svg viewBox="0 0 24 24" fill="none" className="size-3.5" aria-hidden>
      <path d="M2.75 6.75h10.5v9.5H2.75z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M13.25 10.25h3.9l3.1 3.1v2.9h-7z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="7" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="17" cy="17.5" r="1.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  ),
} as const;

/**
 * The storefront's cinematic hero.
 *
 * A large frosted panel with layered depth: the product photography sits at
 * the back, a scrim keeps the copy legible over any image, and the offer chip
 * and calls to action float above on their own glass layers. Auto-advances on
 * a slow timer, pauses while the pointer is inside or a slide has keyboard
 * focus, and stops entirely for reduced-motion visitors.
 */
export function HeroCarousel({ slides = DEFAULT_SLIDES }: { slides?: HeroSlide[] }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotion = useReducedMotion();

  const count = slides.length;
  const go = useCallback(
    (index: number) => setActive((index + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || reducedMotion || count < 2) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % count),
      AUTO_ADVANCE_MS,
    );
    return () => window.clearInterval(timer);
  }, [count, paused, reducedMotion]);

  const slide = slides[active];
  if (!slide) return null;

  return (
    <section className="mx-auto w-full max-w-[1440px] px-4 pt-6 pb-4 lg:px-8 lg:pt-8">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* ------------------------------ Main hero ------------------------------ */}
        <div
          className="glass-hero sheen-follow relative col-span-1 flex min-h-[30rem] flex-col justify-end overflow-hidden rounded-[var(--radius-sheet)] lg:col-span-8 lg:min-h-[34rem]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocusCapture={() => setPaused(true)}
          onBlurCapture={() => setPaused(false)}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") go(active + 1);
            if (event.key === "ArrowLeft") go(active - 1);
          }}
        >
          {/* Back layer: the photography, gently drifting between slides. */}
          <div className="absolute inset-0 z-0">
            {slides.map((item, index) => (
              <div
                key={item.id}
                aria-hidden={index !== active}
                className={cn(
                  "absolute inset-0 transition-opacity duration-[900ms] ease-[var(--ease-spatial)]",
                  index === active ? "opacity-100" : "opacity-0",
                )}
              >
                <ImageWithFallback
                  src={item.imageUrl}
                  alt={index === active ? item.imageAlt : ""}
                  loading={index === 0 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  className={cn(
                    "size-full object-cover object-center",
                    !reducedMotion && index === active && "float-slow",
                  )}
                />
              </div>
            ))}
            {/* Scrims: keep text legible over any photography, in both themes. */}
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-r from-[var(--glass-solid)] via-[var(--glass-solid)]/78 to-[var(--glass-solid)]/10"
            />
            <div
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-[var(--glass-solid)] via-[var(--glass-solid)]/60 to-transparent"
            />
          </div>

          {/* Front layer: floating copy. */}
          <div className="relative z-10 flex flex-col gap-5 p-6 sm:p-9 lg:p-12">
            <div className="max-w-xl">
              <span className="glass-surface glass-sheen inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
                {ICONS[slide.icon]}
                {slide.label}
              </span>

              <h1 className="mt-4 text-balance text-3xl font-bold leading-[1.08] tracking-tight text-[var(--color-foreground)] sm:text-4xl lg:text-5xl">
                {slide.title}
              </h1>

              <p className="mt-3 max-w-md text-sm leading-relaxed text-[var(--color-muted-foreground)] sm:text-base">
                {slide.description}
              </p>
            </div>

            {/* Offer chip — its own floating glass layer. */}
            <div className="glass-inset inline-flex w-fit max-w-full items-center gap-2.5 rounded-2xl px-3.5 py-2.5">
              <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                {ICONS[slide.icon]}
              </span>
              <span className="text-xs font-medium text-[var(--color-foreground)] sm:text-sm">
                {slide.offerText}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <Link
                href={slide.primaryHref}
                className="group inline-flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-5 py-3 text-sm font-semibold text-[var(--color-on-primary)] shadow-[var(--spatial-3)] transition-all hover:bg-[var(--color-primary-hover)] hover:shadow-[var(--spatial-4)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                {slide.primaryAction}
                <ArrowRight
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                  aria-hidden
                />
              </Link>
              <Link
                href={slide.secondaryHref}
                className="glass-surface inline-flex items-center rounded-full px-5 py-3 text-sm font-semibold text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
              >
                {slide.secondaryAction}
              </Link>
            </div>
          </div>

          {/* Slide controls: arrows bottom-right, dots bottom-left. */}
          <div className="relative z-10 flex items-center justify-between gap-4 px-6 pb-6 sm:px-9 lg:px-12 lg:pb-10">
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Hero slides">
              {slides.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={index === active}
                  aria-label={`Show slide ${index + 1}: ${item.title}`}
                  onClick={() => go(index)}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-300 ease-[var(--ease-spatial)]",
                    index === active
                      ? "w-8 bg-[var(--color-primary)]"
                      : "w-3 bg-[var(--color-border-strong)]/60 hover:bg-[var(--color-border-strong)]",
                  )}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => go(active - 1)}
                aria-label="Previous slide"
                className="glass-surface grid size-9 place-items-center rounded-full text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
              >
                <ChevronLeft className="size-4" aria-hidden />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                aria-label="Next slide"
                className="glass-surface grid size-9 place-items-center rounded-full text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)]"
              >
                <ChevronRight className="size-4" aria-hidden />
              </button>
            </div>
          </div>
        </div>

        {/* ---------------------------- Paired promo tiles ---------------------------- */}
        <div className="col-span-1 flex flex-col gap-4 lg:col-span-4">
          <PromoTile
            eyebrow="Curated wardrobe"
            title="Spring Capsule Wardrobe"
            body="Pure breathable cottons and tailored linens."
            price="₹799"
            href="/category/fashion-and-apparel"
            imageUrl={DEFAULT_SLIDES[1]?.imageUrl}
            imageAlt="Model wearing a spring linen outfit"
          />
          <PromoTile
            eyebrow="Home innovation"
            title="Smart Home, Simplified"
            body="Robot vacuums, air purifiers and smart lighting."
            price="₹1,499"
            href="/category/home-and-kitchen"
            imageUrl={DEFAULT_SLIDES[2]?.imageUrl}
            imageAlt="Modern living room with smart home devices"
          />
        </div>
      </div>
    </section>
  );
}

function PromoTile({
  eyebrow,
  title,
  body,
  price,
  href,
  imageUrl,
  imageAlt,
}: {
  eyebrow: string;
  title: string;
  body: string;
  price: string;
  href: string;
  imageUrl?: string;
  imageAlt: string;
}) {
  return (
    <Link
      href={href}
      className="depth-lift group relative flex min-h-[10rem] flex-1 flex-col justify-end overflow-hidden rounded-[var(--radius-panel)] p-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
    >
      <div className="absolute inset-0 z-0">
        <ImageWithFallback
          src={imageUrl}
          alt={imageAlt}
          loading="lazy"
          className="size-full object-cover transition-transform duration-700 ease-[var(--ease-spatial)] group-hover:scale-105"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-[#0b1220]/94 via-[#0b1220]/55 to-[#0b1220]/10"
        />
      </div>

      <div className="relative z-10">
        <span className="inline-block rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-sm">
          {eyebrow}
        </span>
        <h3 className="mt-2.5 text-lg font-bold leading-tight text-white">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-white/80">{body}</p>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white">
          From <span className="text-base font-bold">{price}</span>
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden
          />
        </p>
      </div>
    </Link>
  );
}
