"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  LayoutDashboard,
  LogIn,
  LogOut,
  Menu,
  Search,
  ShoppingBag,
  User,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { useCart, useSession } from "@/components/providers";

const NAV = [
  { href: "/products", label: "Shop" },
  { href: "/categories", label: "Categories" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteHeader() {
  const { view, loading } = useCart();
  const { user, authenticated, isAdmin } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement | null>(null);

  // Seed the box from the URL when landing on /search. Read directly from
  // `location` rather than `useSearchParams` so static pages need no
  // Suspense boundary.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.pathname !== "/search") return;
    setQuery(new URLSearchParams(window.location.search).get("q") ?? "");
  }, [pathname]);

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

  function onSearch(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    router.push(trimmed ? `/search?q=${encodeURIComponent(trimmed)}` : "/products");
    setMenuOpen(false);
  }

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--color-border)] bg-white/90 backdrop-blur supports-[backdrop-filter]:bg-white/75">
      <div className="container-page flex h-16 items-center gap-4">
        <button
          type="button"
          className="-ml-1 rounded-[var(--radius-control)] p-1.5 text-[var(--color-foreground)] hover:bg-[var(--color-muted)] lg:hidden"
          onClick={() => setMenuOpen((v) => !v)}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
        </button>

        <Link
          href="/"
          className="flex shrink-0 items-center gap-2 font-semibold tracking-tight text-[var(--color-foreground)]"
        >
          <span
            aria-hidden
            className="grid size-7 place-items-center rounded-lg bg-[var(--color-primary)] text-[13px] font-bold text-white"
          >
            A
          </span>
          <span className="text-[15px]">Aurora</span>
        </Link>

        <nav aria-label="Primary" className="hidden lg:block">
          <ul className="ml-4 flex items-center gap-1">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "rounded-[var(--radius-control)] px-3 py-2 text-sm font-medium transition-colors",
                    pathname === item.href || pathname.startsWith(`${item.href}/`)
                      ? "text-[var(--color-primary)]"
                      : "text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <form
          onSubmit={onSearch}
          role="search"
          className="ml-auto hidden min-w-0 flex-1 items-center md:flex md:max-w-md"
        >
          <label htmlFor="site-search" className="sr-only">
            Search products
          </label>
          <div className="relative w-full">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <input
              id="site-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands…"
              className="h-9 w-full rounded-full border border-[var(--color-input)] bg-[var(--color-muted)] pl-9 pr-3 text-sm text-[var(--color-foreground)] placeholder:text-[var(--color-muted-foreground)] focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1 md:ml-2">
          {isAdmin ? (
            <Link
              href="/admin"
              className="hidden items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)] sm:flex"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              Admin
            </Link>
          ) : null}

          <div className="relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((v) => !v)}
              aria-expanded={accountOpen}
              aria-haspopup="menu"
              className="flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            >
              <User className="size-4" aria-hidden />
              <span className="hidden max-w-[8rem] truncate sm:inline">
                {authenticated && user ? (user.name ?? user.email) : "Sign in"}
              </span>
            </button>

            {accountOpen ? (
              <div
                role="menu"
                className="absolute right-0 top-full mt-2 w-56 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-1.5 shadow-[var(--shadow-popover)] animate-fade-in"
              >
                {authenticated && user ? (
                  <>
                    <div className="px-3 py-2">
                      <p className="truncate text-sm font-medium text-[var(--color-foreground)]">
                        {user.name ?? user.email}
                      </p>
                      <p className="truncate text-xs text-[var(--color-muted-foreground)]">
                        {user.email}
                      </p>
                    </div>
                    <MenuLink href="/account">Your account</MenuLink>
                    <MenuLink href="/orders">Orders</MenuLink>
                    <MenuLink href="/wishlist">Wishlist</MenuLink>
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
                      className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
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

          <Link
            href="/cart"
            className="relative rounded-[var(--radius-control)] p-2 text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]"
            aria-label={`Cart, ${loading ? "loading" : `${view.itemCount} items`}`}
          >
            <ShoppingBag className="size-5" aria-hidden />
            {!loading && view.itemCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-primary)] px-1 text-[10px] font-semibold leading-4 text-white">
                {view.itemCount > 99 ? "99+" : view.itemCount}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* Mobile search */}
      <div className="border-t border-[var(--color-border)] px-4 py-2 md:hidden">
        <form onSubmit={onSearch} role="search">
          <label htmlFor="site-search-mobile" className="sr-only">
            Search products
          </label>
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <input
              id="site-search-mobile"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products, brands…"
              className="h-9 w-full rounded-full border border-[var(--color-input)] bg-[var(--color-muted)] pl-9 pr-3 text-sm focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
        </form>
      </div>

      {menuOpen ? (
        <nav
          id="mobile-nav"
          aria-label="Primary mobile"
          className="border-t border-[var(--color-border)] bg-white lg:hidden"
        >
          <ul className="container-page flex flex-col py-2">
            {NAV.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[var(--radius-control)] px-2 py-2.5 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
                >
                  {item.label}
                </Link>
              </li>
            ))}
            {isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-[var(--radius-control)] px-2 py-2.5 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
                >
                  Admin dashboard
                </Link>
              </li>
            ) : null}
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
      className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-[var(--color-foreground)] hover:bg-[var(--color-muted)]"
    >
      {children}
    </Link>
  );
}
