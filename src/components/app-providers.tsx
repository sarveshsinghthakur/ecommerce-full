"use client";

import { ToastProvider } from "@/components/ui/toast";
import { CartProvider, SessionProvider } from "@/components/providers";
import { WishlistProvider } from "@/components/wishlist/wishlist-provider";

/**
 * Browser-side application state: authentication, cart, wishlist, and
 * transient notifications. Server-only concerns deliberately never enter
 * this tree.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <WishlistProvider>
          <ToastProvider>{children}</ToastProvider>
        </WishlistProvider>
      </CartProvider>
    </SessionProvider>
  );
}
