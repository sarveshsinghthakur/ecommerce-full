"use client";

/**
 * Client-side wishlist.
 *
 * Loop Studio has no backend wishlist API, so wishlist state is kept in the
 * browser (localStorage) and survives reloads for the same device. It is
 * deliberately frontend-only: toggling a wishlist item does not contact a
 * server, and items are not shared across devices or accounts.
 */

const STORAGE_KEY = "loop_wishlist";
let listeners: Array<(ids: string[]) => void> = [];
let ids: string[] = [];

function persist(next: string[]) {
  ids = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage unavailable (private mode, etc.) — keep state in memory only.
  }
  for (const fn of listeners) fn(ids);
}

export function loadWishlist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      ids = parsed.filter((v): v is string => typeof v === "string");
    }
  } catch {
    ids = [];
  }
  return ids;
}

export function isWishlisted(productId: string): boolean {
  return ids.includes(productId);
}

export function toggleWishlist(productId: string): boolean {
  const next = ids.includes(productId)
    ? ids.filter((id) => id !== productId)
    : [...ids, productId];
  persist(next);
  return !ids.includes(productId);
}

export function addToWishlist(productId: string): boolean {
  if (ids.includes(productId)) return false;
  persist([...ids, productId]);
  return true;
}

export function removeFromWishlist(productId: string): boolean {
  if (!ids.includes(productId)) return false;
  persist(ids.filter((id) => id !== productId));
  return true;
}

export function subscribeWishlist(fn: (ids: string[]) => void): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((f) => f !== fn);
  };
}

export function getWishlist(): string[] {
  return ids;
}
