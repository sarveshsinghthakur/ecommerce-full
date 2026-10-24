/**
 * Checkout rules shared by the client (cart/checkout UI) and the server
 * (order creation). Kept server-free so Client Components can import it.
 */

export const FREE_SHIPPING_THRESHOLD = 499;
export const FLAT_SHIPPING_FEE = 49;
export const FREE_SHIPPING_ABOVE = FREE_SHIPPING_THRESHOLD;

export type PaymentMethod = "cod" | "razorpay" | "test";

export interface ShippingAddressInput {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  label?: string;
}

/** Shipping charge for a subtotal expressed in decimal currency units. */
export function shippingFor(subtotal: string | number): number {
  const value = typeof subtotal === "string" ? Number(subtotal) : subtotal;
  if (!Number.isFinite(value) || value < 0) return FLAT_SHIPPING_FEE;
  return value >= FREE_SHIPPING_THRESHOLD ? 0 : FLAT_SHIPPING_FEE;
}

export function qualifiesForFreeShipping(subtotal: string | number): boolean {
  return shippingFor(subtotal) === 0;
}
