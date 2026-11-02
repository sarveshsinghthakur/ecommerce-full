import { AppProviders } from "@/components/app-providers";
import { AnimatedMain } from "@/components/animated";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader, type NavCategory } from "@/components/layout/site-header";
import { AmbientOrbs } from "@/components/layout/ambient-orbs";
import { MobileStoreDock } from "@/components/layout/mobile-store-dock";
import { CartDrawer } from "@/components/store/cart-drawer";
import { PointerProvider } from "@/components/spatial";
import { listCategories } from "@/server/catalog";

export default async function StoreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Nav links are derived from the catalogue so a category slug can never
  // drift out of sync and 404 (this happened with hand-written slugs).
  const categories: NavCategory[] = (await listCategories()).map(
    ({ slug, name }) => ({ slug, name }),
  );

  return (
    <AppProviders>
      <PointerProvider>
        <div className="flex min-h-dvh flex-col">
          <AmbientOrbs />
          <SiteHeader categories={categories} />
          <AnimatedMain>{children}</AnimatedMain>
          <SiteFooter categories={categories} />
          <MobileStoreDock />
          <CartDrawer />
        </div>
      </PointerProvider>
    </AppProviders>
  );
}
