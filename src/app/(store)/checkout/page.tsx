import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, AuthError } from "@/lib/auth/authorize";
import { getCheckoutSummary } from "@/server/checkout";
import { CheckoutForm } from "@/components/store/checkout-form";

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
          <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
            Nothing to check out
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
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
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Your card and banking details are never stored by Aurora.
        </p>
      </div>

      <CheckoutForm summary={summary} />
    </div>
  );
}
