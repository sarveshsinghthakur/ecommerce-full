import Link from "next/link";

const columns: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Shop",
    links: [
      { href: "/products", label: "All products" },
      { href: "/categories", label: "Categories" },
      { href: "/products?sort=newest", label: "New arrivals" },
      { href: "/products?sort=rating", label: "Top rated" },
    ],
  },
  {
    title: "Help",
    links: [
      { href: "/contact", label: "Contact us" },
      { href: "/faq", label: "FAQ" },
      { href: "/orders", label: "Track your order" },
      { href: "/shipping-policy", label: "Shipping policy" },
    ],
  },
  {
    title: "Policies",
    links: [
      { href: "/returns-and-refunds", label: "Returns & refunds" },
      { href: "/privacy-policy", label: "Privacy policy" },
      { href: "/terms-and-conditions", label: "Terms & conditions" },
    ],
  },
];

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-16 border-t border-[var(--color-border)] bg-[var(--color-muted)]">
      <div className="container-page grid gap-8 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div className="max-w-xs">
          <div className="flex items-center gap-2">
            <span
              aria-hidden
              className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary)] text-[13px] font-bold text-white"
            >
              A
            </span>
            <span className="font-semibold tracking-tight">Aurora</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted-foreground)]">
            Curated everyday essentials with transparent, markup-controlled
            pricing and fast delivery.
          </p>
        </div>

        {columns.map((column) => (
          <nav key={column.title} aria-label={column.title}>
            <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
              {column.title}
            </h3>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="border-t border-[var(--color-border)]">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-[var(--color-muted-foreground)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Aurora Store. All rights reserved.</p>
          <p>Prices shown include the store markup over source cost.</p>
        </div>
      </div>
    </footer>
  );
}
