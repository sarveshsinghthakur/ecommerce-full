import Link from "next/link";
import {
  Headphones,
  Lock,
  RotateCcw,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";

/* --------------------------------------------------------------------------
   Footer link columns. Every href here points at a route that exists in
   this app — the previous version repeated /about five times under distinct
   labels ("Careers", "Press Kit", "Engineering Blog"…), which read as links
   that had been designed but never built.
   -------------------------------------------------------------------------- */

interface FooterCategory {
  slug: string;
  name: string;
}

const columns: Array<{
  title: string;
  links: Array<{ href: string; label: string }>;
}> = [
  {
    title: "About Loop",
    links: [
      { href: "/about", label: "Company profile" },
      { href: "/contact", label: "Contact the team" },
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms-and-conditions", label: "Terms & conditions" },
    ],
  },
  {
    title: "Customer care",
    links: [
      { href: "/faq", label: "Help center & FAQs" },
      { href: "/orders", label: "Track your delivery" },
      { href: "/returns-and-refunds", label: "Returns & refunds" },
      { href: "/shipping-policy", label: "Shipping rates & policy" },
    ],
  },
];

const sellerColumn = {
  title: "Sellers hub",
  links: [
    { href: "/contact", label: "Sell on Loop Studio" },
    { href: "/admin", label: "Merchant dashboard" },
    { href: "/contact", label: "Advertise your products" },
  ],
};

/** How many catalogue categories the footer's Categories column shows. */
const FOOTER_CATEGORY_LIMIT = 5;

const trustBadges: { icon: LucideIcon; title: string; body: string }[] = [
  {
    icon: ShieldCheck,
    title: "100% genuine",
    body: "Sourced directly from verified brands",
  },
  {
    icon: RotateCcw,
    title: "7-day easy returns",
    body: "Instant pickup and no-question policy",
  },
  {
    icon: Lock,
    title: "Secure payments",
    body: "256-bit SSL encrypted transactions",
  },
  {
    icon: Headphones,
    title: "Dedicated care",
    body: "Chat and call support whenever you need it",
  },
];

const paymentPartners = ["UPI", "RuPay", "VISA", "Mastercard", "NetBanking"];

export function SiteFooter({
  categories = [],
}: {
  categories?: FooterCategory[];
}) {
  const year = new Date().getFullYear();

  const categoryColumn = {
    title: "Categories",
    links: categories
      .slice(0, FOOTER_CATEGORY_LIMIT)
      .map((category) => ({
        href: `/category/${category.slug}`,
        label: category.name,
      })),
  };

  const allColumns = [
    columns[0],
    columns[1],
    categoryColumn,
    sellerColumn,
  ].filter((col): col is { title: string; links: Array<{ href: string; label: string }> } => col !== undefined);

  return (
    <footer className="mt-16 w-full border-t border-[var(--glass-line)] text-[var(--color-foreground)]">
      {/* Trust badges */}
      <div className="border-b border-[var(--glass-line)] bg-[var(--glass-fill-soft)] py-6 backdrop-blur-md">
        <ul className="mx-auto grid max-w-[1440px] grid-cols-2 gap-5 px-4 md:grid-cols-4 lg:px-8">
          {trustBadges.map((badge) => {
            const Icon = badge.icon;
            return (
              <li key={badge.title} className="flex items-start gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-tile)] border border-[var(--glass-line)] bg-[var(--glass-fill)] text-[var(--color-foreground)] backdrop-blur-md">
                  <Icon className="size-5" aria-hidden strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                    {badge.title}
                  </h3>
                  <p className="text-xs leading-relaxed text-[var(--color-muted-foreground)]">
                    {badge.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Main grid */}
      <div className="mx-auto max-w-[1440px] px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-6 lg:gap-10">
          {/* Brand + shortcuts */}
          <div className="flex flex-col gap-4 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span
                aria-hidden
                className="grid size-9 place-items-center rounded-[var(--radius-tile)] bg-[var(--color-primary)] text-sm font-bold text-[var(--color-on-primary)]"
              >
                L
              </span>
              <span className="text-lg font-semibold tracking-tight text-[var(--color-foreground)]">
                Loop Studio
              </span>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              A curated marketplace connecting thoughtful modern lifestyles
              with authentic electronics, high-street apparel, kitchen
              novelties and daily essentials.
            </p>

            <nav aria-label="Your account" className="mt-2 flex flex-col gap-2">
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                Your account
              </h3>
              <ul className="flex flex-col gap-1.5">
                {[
                  { href: "/wishlist", label: "Wishlist" },
                  { href: "/orders", label: "Orders & delivery" },
                  { href: "/cart", label: "Shopping bag" },
                  { href: "/contact", label: "Contact support" },
                ].map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Link columns */}
          {allColumns.map((column) => (
            <nav
              key={column.title}
              aria-label={column.title}
              className="flex flex-col gap-3"
            >
              <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
                {column.title}
              </h3>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-[var(--color-muted-foreground)] underline-offset-4 transition-colors hover:text-[var(--color-foreground)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Bottom row */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-[var(--glass-line)] pt-6 text-xs text-[var(--color-muted-foreground)] md:flex-row">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>Payment partners:</span>
            {paymentPartners.map((partner) => (
              <span
                key={partner}
                className="rounded-md border border-[var(--glass-line)] bg-[var(--glass-fill)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--color-foreground)] backdrop-blur-md"
              >
                {partner}
              </span>
            ))}
          </div>
          <p>
            &copy; {year} Loop Studio Technologies Pvt Ltd. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
