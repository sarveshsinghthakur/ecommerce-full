"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { CartView } from "@/lib/cart/types";

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  photo: string | null;
  emailVerified: boolean;
}

interface SessionState {
  user: SessionUser | null;
  authenticated: boolean;
  isAdmin: boolean;
  adminConfigured: boolean;
  adminSetupHint?: string;
  /** Firebase web SDK config present, i.e. real email/Google sign-in can run. */
  firebaseClientConfigured: boolean;
  /** Local-dev shim available (AUTH_TEST_MODE outside production). */
  testModeAvailable: boolean;
  loading: boolean;
}

interface SessionContextValue extends SessionState {
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  applySession: () => Promise<void>;
}

const SessionContext = createContext<SessionContextValue | null>(null);

async function readSession(): Promise<SessionState> {
  try {
    const res = await fetch("/api/auth/me", { cache: "no-store" });
    if (!res.ok) throw new Error(`me ${res.status}`);
    const data = await res.json();
    return {
      user: data.user ?? null,
      authenticated: Boolean(data.authenticated),
      isAdmin: Boolean(data.isAdmin),
      adminConfigured: Boolean(data.adminConfigured),
      adminSetupHint: data.adminSetupHint,
      firebaseClientConfigured: Boolean(data.firebaseClientConfigured),
      testModeAvailable: Boolean(data.testModeAvailable),
      loading: false,
    };
  } catch {
    return {
      user: null,
      authenticated: false,
      isAdmin: false,
      adminConfigured: false,
      firebaseClientConfigured: false,
      testModeAvailable: false,
      loading: false,
    };
  }
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<SessionState>({
    user: null,
    authenticated: false,
    isAdmin: false,
    adminConfigured: false,
    firebaseClientConfigured: false,
    testModeAvailable: false,
    loading: true,
  });
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    void readSession().then((next) => {
      if (mounted.current) setState(next);
    });
    return () => {
      mounted.current = false;
    };
  }, []);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    const next = await readSession();
    if (mounted.current) setState(next);
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    if (mounted.current) {
      setState((prev) => ({
        ...prev,
        user: null,
        authenticated: false,
        isAdmin: false,
        loading: false,
      }));
    }
  }, []);

  const value = useMemo<SessionContextValue>(
    () => ({ ...state, refresh, signOut, applySession: refresh }),
    [state, refresh, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>.");
  return ctx;
}

/* --------------------------------- cart ---------------------------------- */

interface CartContextValue {
  view: CartView;
  loading: boolean;
  /** Last failed cart mutation/refresh, for inline display. */
  error: string | null;
  add: (productId: string, quantity?: number) => Promise<CartView | null>;
  setQuantity: (itemId: string, quantity: number) => Promise<CartView | null>;
  remove: (itemId: string) => Promise<CartView | null>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const EMPTY_CART: CartView = {
  id: "",
  kind: "guest",
  lines: [],
  itemCount: 0,
  subtotal: "0.00",
  currency: "INR",
};

async function readCart(): Promise<CartView> {
  const res = await fetch("/api/cart", { cache: "no-store" });
  if (!res.ok) throw new Error(`cart ${res.status}`);
  return (await res.json()) as CartView;
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [view, setView] = useState<CartView>(EMPTY_CART);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mounted = useRef(true);

  const refresh = useCallback(async () => {
    try {
      const next = await readCart();
      if (mounted.current) {
        setView(next);
        setError(null);
      }
    } catch {
      if (mounted.current) setError("Could not load your cart.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void refresh();
    return () => {
      mounted.current = false;
    };
  }, [refresh]);

  const apply = useCallback(
    async (res: Response): Promise<CartView | null> => {
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Your cart could not be updated.");
      }
      const next = (await res.json()) as CartView;
      if (mounted.current) setView(next);
      return next;
    },
    [],
  );

  const add = useCallback(
    async (productId: string, quantity = 1) => {
      const res = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, quantity }),
      });
      return apply(res);
    },
    [apply],
  );

  const setQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity }),
      });
      return apply(res);
    },
    [apply],
  );

  const remove = useCallback(
    async (itemId: string) => {
      const res = await fetch(`/api/cart/items/${encodeURIComponent(itemId)}`, {
        method: "DELETE",
      });
      return apply(res);
    },
    [apply],
  );

  const clear = useCallback(async () => {
    const res = await fetch("/api/cart", { method: "DELETE" });
    if (res.ok) {
      const next = (await res.json()) as CartView;
      if (mounted.current) setView(next);
    }
  }, []);

  const value = useMemo<CartContextValue>(
    () => ({ view, loading, error, add, setQuantity, remove, clear, refresh }),
    [view, loading, error, add, setQuantity, remove, clear, refresh],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>.");
  return ctx;
}
