"use client";

import { ToastProvider } from "@/components/ui/toast";
import { CartProvider, SessionProvider } from "@/components/providers";

/**
 * Browser-side application state: authentication, cart, and transient
 * notifications. Server-only concerns deliberately never enter this tree.
 */
export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <CartProvider>
        <ToastProvider>{children}</ToastProvider>
      </CartProvider>
    </SessionProvider>
  );
}
