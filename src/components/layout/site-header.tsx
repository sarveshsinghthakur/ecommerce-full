"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ChevronDown,
  LayoutGrid,
  LogIn,
  LogOut,
  Menu,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart, useSession } from "@/components/providers";

import { ThemeToggle } from "@/components/ui/theme-toggle";
import { FocusModeToggle } from "@/components/ui/focus-mode-toggle";
import { BrandMark } from "@/components/layout/brand-mark";
import { SearchBox } from "@/components/layout/search-box";
import { MegaMenu } from "@/components/layout/mega-menu";
import { formatMoney } from "@/lib/money";

/* -------------------------------------------------------------------------- */
/* Nav = static campaign links + real catalogue categories. Categories come   */
/* from the server layout (derived from the DB) so slugs can never 404.       */
/* -------------------------------------------------------------------------- */

export interface NavCategory {
  slug: string;
  name: string;
}

/** Category chips shown in the secondary nav row. */
const NAV_CATEGORY_LIMIT = 6;

function buildCategoryNav(categories: NavCategory[]) {
  return [
    {
      href: "/products?deals=1&sort=discount",
      label: "Today's Deals",
      variant: "deals" as const,
    },
    { href: "/products?sort=newest", label: "New Arrivals" },
    ...categories.slice(0, NAV_CATEGORY_LIMIT).map((category) => ({
      href: `/category/${category.slug}`,
      label: category.name,
    })),
    {
      href: "/products?max=499",
      label: "Under ₹499 Bazaar",
      variant: "bazaar" as const,
    },
  ];
}

const PRIMARY_NAV = [
  { href: "/products", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader({ categories = [] }: { categories?: NavCategory[] }) {
  const categoryNav = buildCategoryNav(categories);
  const { view, loading } = useCart();
  const { user, authenticated, isAdmin } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [menuOpen, setMenuOpen] = useState(false);
  const [megaOpen, setMegaOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [cartPulse, setCartPulse] = useState(false);
  const [condensed, setCondensed] = useState(false);

  const accountRef = useRef<HTMLDivElement | null>(null);
  const megaTriggerRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!accountOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAccountOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [accountOpen]);

  // Close overlays on route change.
  useEffect(() => {
    setMenuOpen(false);
    setMegaOpen(false);
    setAccountOpen(false);
  }, [pathname]);

  // Condense the header once the page has scrolled past the fold, which keeps
  // the floating glass panel feeling light instead of wall-like.
  useEffect(() => {
    const onScroll = () => setCondensed(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // The header is fixed and its height changes with the breakpoint (the
  // category row and mobile search bar are conditional) and with the
  // condensed state. Rather than guessing a pixel offset, publish the real
  // height as `--header-h` so <main> can reserve exactly the right space.
  const shellRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = shellRef.current;
    if (!node) return;

    const apply = () => {
      document.documentElement.style.setProperty(
        "--header-h",
        `${Math.ceil(node.offsetHeight)}px`,
      );
    };

    apply();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", apply);
      return () => window.removeEventListener("resize", apply);
    }

    const observer = new ResizeObserver(apply);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (loading || view.itemCount === 0) return;
    setCartPulse(true);
    const timer = window.setTimeout(() => setCartPulse(false), 520);
    return () => window.clearTimeout(timer);
  }, [loading, view.itemCount]);

  const openCart = useCallback(() => {
    window.dispatchEvent(new Event("loop:open-cart"));
  }, []);

  const cartTotal =
    !loading && view.itemCount > 0
      ? formatMoney(view.subtotal, view.currency, { showDecimals: false })
      : null;

  return (
    <header
      ref={shellRef}
      className={cn(
        "fixed inset-x-0 top-0 z-40 transition-[padding] duration-300 ease-[var(--ease-spatial)]",
        condensed ? "pt-2" : "pt-3 lg:pt-4",
      )}
    >
      {/* The floating glass bar itself — inset from the viewport edges so it
          reads as a hovering panel rather than a full-bleed header strip. */}
      <div
        className={cn(
          "glass-surface mx-auto w-[min(100%-1rem,88rem)] rounded-[var(--radius-panel)] transition-shadow duration-300",
          condensed ? "shadow-[var(--spatial-4)]" : "shadow-[var(--spatial-3)]",
        )}
      >
        {/* ---------------------------- Utility row ---------------------------- */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border)]/70 px-4 py-1.5 text-[11px] text-[var(--color-muted-foreground)]">
          <p className="flex items-center gap-1.5 truncate">
            <span className="inline-flex size-1.5 shrink-0 rounded-full bg-[var(--color-success)]" aria-hidden />
            <span className="truncate">
              Spring Mega Sale — free delivery over ₹499
            </span>
          </p>
          <div className="flex shrink-0 items-center gap-4">
            <span className="hidden lg:inline">Deliver to India</span>
            <span className="hidden md:inline">INR (₹) · EN</span>
            <Link href="/contact" className="transition-colors hover:text-[var(--color-primary)]">
              Support
            </Link>
            {isAdmin ? (
              <Link
                href="/admin"
                className="font-semibold text-[var(--color-primary)] transition-colors hover:underline"
              >
                Admin
              </Link>
            ) : null}
          </div>
        </div>

        {/* ------------------------------ Main row ------------------------------ */}
        <div className="flex items-center gap-3 px-3 py-2.5 sm:px-4">
          {/* Mobile menu trigger */}
          <button
            type="button"
            className="grid size-9 shrink-0 place-items-center rounded-full text-[var(--color-foreground)] transition hover:bg-[var(--color-muted)] lg:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
          </button>

          {/* Brand */}
          <Link href="/" className="flex shrink-0 items-center gap-2">
            <BrandMark className="size-9 rounded-xl" />
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-[15px] font-bold tracking-tight text-[var(--color-foreground)]">
                Loop Studio
              </span>
              <span className="mt-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Spatial Storefront
              </span>
            </span>
          </Link>

          {/* Desktop search */}
          <SearchBox className="mx-2 hidden max-w-2xl flex-1 md:block" />

          {/* Actions */}
          <div className="flex shrink-0 items-center gap-1.5">
            <ThemeToggle className="hidden lg:inline-flex" />
            <FocusModeToggle />

            {/* Account */}
            <div className="relative" ref={accountRef}>
              <button
                type="button"
                onClick={() => setAccountOpen((v) => !v)}
                aria-expanded={accountOpen}
                aria-haspopup="menu"
                className="flex items-center gap-1.5 rounded-full px-2 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
              >
                <User className="size-[18px]" aria-hidden />
                <span className="hidden max-w-[8rem] truncate text-xs xl:inline">
                  {authenticated && user ? `Hi, ${user.name ?? user.email}` : "Sign in"}
                </span>
              </button>

              {accountOpen ? (
                <div
                  role="menu"
                  className="glass-raised spatial-rise absolute right-0 top-full z-50 mt-2 w-60 rounded-[var(--radius-tile)] p-1.5"
                >
                  {authenticated && user ? (
                    <>
                      <div className="border-b border-[var(--color-border)] px-3 py-2.5">
                        <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                          {user.name ?? user.email}
                        </p>
                        <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                          {user.email}
                        </p>
                      </div>
                      <MenuLink href="/orders">Orders</MenuLink>
                      {isAdmin ? <MenuLink href="/admin">Admin dashboard</MenuLink> : null}
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setAccountOpen(false);
                          void fetch("/api/auth/logout", { method: "POST" }).then(() =>
                            router.refresh(),
                          );
                        }}
                        className="flex w-full items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-left text-sm text-[var(--color-destructive)] transition-colors hover:bg-[var(--color-destructive-soft)]"
                      >
                        <LogOut className="size-4" aria-hidden />
                        Sign out
                      </button>
                    </>
                  ) : (
                    <>
                      <MenuLink href="/login">
                        <LogIn className="size-4" aria-hidden />
                        Sign in
                      </MenuLink>
                      <MenuLink href="/signup">Create account</MenuLink>
                      <MenuLink href="/orders">Track an order</MenuLink>
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {/* Cart */}
            <button
              type="button"
              onClick={openCart}
              className={cn(
                "relative flex items-center gap-2 rounded-full bg-[var(--color-primary)] px-3 py-2 text-[var(--color-on-primary)] transition-all hover:bg-[var(--color-primary-hover)]",
                cartPulse && "cart-pop",
              )}
              aria-label={`Open cart, ${loading ? "loading" : `${view.itemCount} items`}`}
            >
              <ShoppingBag className="size-[18px]" aria-hidden />
              <span className="hidden flex-col items-start leading-none sm:flex">
                <span className="text-[9px] uppercase tracking-wider opacity-80">Bag</span>
                <span className="text-xs font-bold tabular-nums">
                  {cartTotal ?? "₹0"}
                </span>
              </span>
              {!loading && view.itemCount > 0 ? (
                <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--color-on-primary)] px-1 text-[10px] font-bold text-[var(--color-primary)]">
                  {view.itemCount > 99 ? "99+" : view.itemCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>

        {/* --------------------------- Category row --------------------------- */}
        <div className="relative hidden border-t border-[var(--color-border)]/70 lg:block">
          <nav
            className="flex items-center gap-1 overflow-x-auto px-3 py-1.5 no-scrollbar"
            aria-label="Categories"
          >
            <div className="relative shrink-0">
              <button
                ref={megaTriggerRef}
                type="button"
                onClick={() => setMegaOpen((v) => !v)}
                aria-expanded={megaOpen}
                aria-haspopup="dialog"
                className={cn(
                  "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                  megaOpen
                    ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                    : "bg-[var(--color-surface-container)] text-[var(--color-foreground)] hover:bg-[var(--color-surface-container-high)]",
                )}
              >
                <LayoutGrid className="size-3.5" aria-hidden />
                <span>All Categories</span>
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    megaOpen && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              <MegaMenu
                open={megaOpen}
                onClose={() => setMegaOpen(false)}
                categories={categories}
                triggerRef={megaTriggerRef}
              />
            </div>

            <div className="flex flex-nowrap items-center gap-0.5 whitespace-nowrap">
              {categoryNav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                    item.variant === "deals" &&
                      "font-bold text-[var(--color-sale)] hover:bg-[var(--color-sale-soft)]",
                    item.variant === "bazaar" &&
                      "font-semibold text-[var(--color-tertiary)] hover:bg-[var(--color-tertiary-fixed)]",
                    !item.variant &&
                      "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      </div>

      {/* ---------------------------- Mobile search ---------------------------- */}
      <div className="mx-auto mt-2 w-[min(100%-1rem,88rem)] px-0 md:hidden">
        <SearchBox id="site-search-mobile" />
      </div>

      {/* -------------------------- Mobile nav sheet -------------------------- */}
      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="glass-raised spatial-rise mx-auto mt-2 w-[min(100%-1rem,88rem)] rounded-[var(--radius-panel)] p-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {PRIMARY_NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[var(--radius-control)] px-3 py-2.5 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            <li className="mt-2 border-t border-[var(--color-border)] pt-2">
              <p className="px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                Departments
              </p>
            </li>
            {categoryNav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className={cn(
                    "block rounded-[var(--radius-control)] px-3 py-2.5 text-sm transition-colors",
                    item.variant === "deals" && "font-bold text-[var(--color-sale)]",
                    item.variant === "bazaar" && "font-semibold text-[var(--color-tertiary)]",
                    !item.variant &&
                      "text-[var(--color-foreground)] hover:bg-[var(--color-muted)]",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      className="flex items-center gap-2 rounded-[var(--radius-control)] px-3 py-2 text-sm text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-muted)]"
    >
      {children}
    </Link>
  );
}
