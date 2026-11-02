"use client";

import Link from "next/link";
import { Grid2X2, Heart, House, Search, ShoppingBag } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { useCart } from "@/components/providers";
import { useWishlist } from "@/components/wishlist/wishlist-provider";

const items = [
  { href: "/", label: "Home", icon: House },
  { href: "/categories", label: "Browse", icon: Grid2X2 },
  { href: "/products", label: "Search", icon: Search },
  { href: "/wishlist", label: "Saved", icon: Heart },
  { href: "/cart", label: "Cart", icon: ShoppingBag },
];

/** A thumb-friendly dock shown only on small screens. */
export function MobileStoreDock() {
  const pathname = usePathname();
  const { view, loading } = useCart();
  const { ids } = useWishlist();

  return (
    <nav
      aria-label="Mobile store navigation"
      className="glass-raised fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-md items-center justify-around rounded-[var(--radius-panel)] p-1.5 md:hidden"
    >
      {items.map(({ href, label, icon: Icon }) => {
        const active =
          href === "/" ? pathname === href : pathname.startsWith(href);
        const badge =
          href === "/cart" && !loading && view.itemCount > 0
            ? view.itemCount
            : href === "/wishlist" && ids.length > 0
              ? ids.length
              : null;

        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-12 min-w-12 flex-1 flex-col items-center justify-center gap-0.5 rounded-[var(--radius-tile)] px-1 text-[10px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--color-primary)]",
              active
                ? "bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-[var(--spatial-2)]"
                : "text-[var(--color-muted-foreground)] hover:bg-[var(--glass-fill)] hover:text-[var(--color-foreground)]",
            )}
          >
            <Icon className="size-[18px]" aria-hidden />
            <span>{label}</span>
            {badge !== null ? (
              <span className="absolute right-1.5 top-0.5 grid min-w-4 place-items-center rounded-full bg-[var(--color-sale)] px-1 text-[9px] font-bold tabular-nums text-white">
                {badge > 9 ? "9+" : badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}
