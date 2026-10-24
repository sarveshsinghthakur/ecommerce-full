/**
 * Client-safe checkout shapes.
 *
 * Declared outside `src/server/checkout.ts` (which is `server-only`) so the
 * checkout form can type its props without pulling server code into the
 * browser bundle.
 */

import type { PaymentMethod } from "./checkout-policy";

export interface SavedAddress {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefaultShipping: boolean;
}

export interface CheckoutLine {
  id: string;
  productId: string;
  variantId: string | null;
  quantity: number;
  title: string;
  variantName: string | null;
  slug: string;
  imageUrl: string | null;
  brand: string | null;
  currency: string;
  unitPrice: string;
  sourcePrice: string | null;
  markupPercent: string | null;
  referencePrice: string | null;
  lineTotal: string;
  stockQuantity: number | null;
  blocked: boolean;
  blockedReason: string | null;
}

export interface CheckoutSummary {
  lines: CheckoutLine[];
  itemCount: number;
  subtotal: string;
  shipping: string;
  total: string;
  currency: string;
  qualifiesForFreeShipping: boolean;
  addresses: SavedAddress[];
  profile: { fullName: string; email: string; phone: string | null };
  paymentMethods: PaymentMethod[];
  onlineConfigured: boolean;
  testPaymentsAvailable: boolean;
}
