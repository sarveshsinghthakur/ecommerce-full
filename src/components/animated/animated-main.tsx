"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

/**
 * The store's `<main>` with a soft entrance animation on every route change:
 * remounting on `pathname` replays `page-enter`, so navigating feels like a
 * fresh render instead of an instant swap.
 *
 * Top padding comes from `--header-h`, which the fixed header publishes via a
 * ResizeObserver. The header's height differs between breakpoints (the
 * category row and the mobile search bar are conditional), so a hard-coded
 * offset would either overlap the content or leave a gap.
 */
export function AnimatedMain({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const pathname = usePathname();
  return (
    <main
      key={pathname}
      className={cn(
        "flex-1 page-enter pt-[calc(var(--header-h,10rem)+1.5rem)]",
        className,
      )}
    >
      {children}
    </main>
  );
}
