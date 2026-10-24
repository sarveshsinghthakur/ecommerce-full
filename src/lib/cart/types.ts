/**
 * Client-safe cart types.
 *
 * Deliberately lives outside `lib/cart/index.ts` (which is `server-only`) so
 * Client Components can import these shapes without pulling server code into
 * the browser bundle.
 */

export interface CartLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  title: string;
  slug: string;
  imageUrl: string | null;
  sellingPrice: string;
  referencePrice: string | null;
  currency: string;
  availability: string;
  purchasable: boolean;
  brand: string | null;
  lineTotal: string;
  stockQuantity: number | null;
}

export interface CartView {
  id: string;
  kind: "user" | "guest";
  lines: CartLine[];
  itemCount: number;
  subtotal: string;
  currency: string;
}

export const MAX_LINE_QUANTITY = 10;
export const MAX_CART_LINES = 50;
