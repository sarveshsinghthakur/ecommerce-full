"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  addToWishlist,
  loadWishlist,
  removeFromWishlist,
  subscribeWishlist,
  toggleWishlist,
} from "@/lib/wishlist";

interface WishlistContextValue {
  ids: string[];
  isWishlisted: (productId: string) => boolean;
  toggle: (productId: string) => boolean;
  add: (productId: string) => boolean;
  remove: (productId: string) => boolean;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [ids, setIds] = useState<string[]>([]);

  useEffect(() => {
    setIds(loadWishlist());
    const unsubscribe = subscribeWishlist((next) => setIds(next));
    return unsubscribe;
  }, []);

  const toggle = useCallback(
    (productId: string) => {
      const added = toggleWishlist(productId);
      return added;
    },
    [],
  );

  const add = useCallback(
    (productId: string) => {
      return addToWishlist(productId);
    },
    [],
  );

  const remove = useCallback(
    (productId: string) => {
      return removeFromWishlist(productId);
    },
    [],
  );

  const isWishlisted = useCallback(
    (productId: string) => ids.includes(productId),
    [ids],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({ ids, isWishlisted, toggle, add, remove }),
    [ids, isWishlisted, toggle, add, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    throw new Error("useWishlist must be used inside <WishlistProvider>.");
  }
  return ctx;
}
