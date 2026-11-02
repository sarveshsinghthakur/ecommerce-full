import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, AuthError } from "@/lib/auth/authorize";
import { getCheckoutSummary } from "@/server/checkout";
import { CheckoutForm } from "@/components/store/checkout-form";
import { Reveal } from "@/components/animated";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Checkout",
  description: "Confirm your address and payment method.",
  robots: { index: false, follow: false },
};

export default async function CheckoutPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }

  const summary = await getCheckoutSummary(user.id, {
    fullName: user.displayName ?? "",
    email: user.email,
    phone: user.phone ?? null,
  });

  if (summary.lines.length === 0 || summary.lines.every((line) => line.blocked)) {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-lg rounded-[var(--radius-card)] border border-dashed border-[var(--color-border)] bg-[var(--color-muted)] p-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-on-surface)]">
            Nothing to check out
          </h1>
          <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
            Your cart is empty or every item is currently unavailable.
          </p>
          <Link
            href="/products"
            className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Browse products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-6 sm:py-8">
      {/* Minimalist Secure Checkout Banner (site header already renders the logo/nav above) */}
      <div role="region" aria-label="Secure checkout" className="w-full bg-[var(--color-surface-container-lowest)] shadow-sm">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-4 flex items-center justify-end">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)] bg-[var(--color-surface-container-low)] px-3 py-1.5 rounded-full">
              <span className="material-symbols-outlined text-[var(--color-primary)] type-title-md" style={{ fontVariationSettings: "'FILL' 1" }}>
                verified_user
              </span>
              <span className="type-label-sm tracking-wide hidden sm:inline">
                256-Bit SSL Encrypted Checkout
              </span>
              <span className="type-label-sm tracking-wide sm:hidden">
                Secure
              </span>
            </div>
            <a
              href="#support"
              className="flex items-center gap-1.5 text-[var(--color-primary)] hover:text-[var(--color-on-primary-fixed-variant)] transition-colors type-label-sm"
            >
              <span className="material-symbols-outlined type-title-md">support_agent</span>
              <span className="hidden md:inline">24/7 Priority Support</span>
            </a>
          </div>
        </div>
      </div>

      {/* Progress Flow Breadcrumb / Stepper */}
      <div className="w-full bg-[var(--color-surface-container-low)] py-4 px-4 sm:px-8">
        <div className="max-w-[1440px] mx-auto">
          <div className="flex items-center justify-between sm:justify-center sm:gap-10">
            {/* Step 1: Address (Complete) */}
            <div className="flex items-center gap-2 text-[var(--color-primary)] cursor-pointer group">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary)] flex items-center justify-center type-label-sm shadow-sm group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[16px]">check</span>
              </div>
              <span className="type-label-md hidden sm:inline text-[var(--color-on-surface)]">
                Delivery Address
              </span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-[var(--color-primary)]/40 rounded-full"></div>
            {/* Step 2: Shipping (Active) */}
            <div className="flex items-center gap-2 text-[var(--color-primary)]">
              <div className="w-7 h-7 rounded-full bg-[var(--color-primary-container)] text-[var(--color-on-primary)] flex items-center justify-center type-label-sm ring-4 ring-[var(--color-primary-fixed)]/50">
                2
              </div>
              <span className="type-label-md font-bold hidden sm:inline text-[var(--color-primary)]">
                Review & Delivery
              </span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-[var(--color-outline-variant)] rounded-full"></div>
            {/* Step 3: Payment (In-Progress) */}
            <div className="flex items-center gap-2 text-[var(--color-on-surface-variant)]">
              <div className="w-7 h-7 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)] flex items-center justify-center type-label-sm">
                3
              </div>
              <span className="type-label-md hidden sm:inline">Payment</span>
            </div>
            <div className="w-8 sm:w-16 h-0.5 bg-[var(--color-outline-variant)] rounded-full"></div>
            {/* Step 4: Confirmation */}
            <div className="flex items-center gap-2 text-[var(--color-secondary)]">
              <div className="w-7 h-7 rounded-full bg-[var(--color-surface-container-highest)] text-[var(--color-secondary)] flex items-center justify-center type-label-sm">
                4
              </div>
              <span className="type-label-md hidden sm:inline">Confirmation</span>
            </div>
          </div>
        </div>
      </div>

      {/* Primary Checkout Grid Layout */}
      <div className="max-w-[1440px] mx-auto w-full px-4 sm:px-8 py-8 md:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: Forms, Delivery & Payment Selectors */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            <Reveal delay={120}>
              <CheckoutForm summary={summary} />
            </Reveal>
          </div>
        </div>
      </div>
    </div>
  );
}
