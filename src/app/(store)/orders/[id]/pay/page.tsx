import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser, AuthError } from "@/lib/auth/authorize";
import { getOrderForUser } from "@/server/orders";
import { PaymentPanel } from "@/components/store/payment-panel";
import { Price } from "@/components/ui/price";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Complete payment",
  robots: { index: false, follow: false },
};

export default async function PayPage({ params }: { params: Promise<{ id: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }

  const { id } = await params;
  const order = await getOrderForUser(user.id, id);
  if (!order) notFound();

  if (order.paymentStatus === "paid" || order.status === "confirmed") {
    return (
      <div className="container-page py-16">
        <div className="mx-auto max-w-md rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-8 text-center">
          <h1 className="text-lg font-semibold text-[var(--color-foreground)]">
            Nothing to pay
          </h1>
          <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
            Order {order.orderNumber} has already been settled.
          </p>
          <Link
            href={`/orders/${order.id}`}
            className="mt-5 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            View order
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container-page py-10">
      <div className="mx-auto w-full max-w-md">
        <Link
          href={`/orders/${order.id}`}
          className="text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
        >
          ← Back to {order.orderNumber}
        </Link>

        <div className="mt-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-6 shadow-[var(--shadow-card)]">
          <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
            Amount due
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-[var(--color-foreground)]">
            <Price value={order.total} currency={order.currency} />
          </p>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {order.orderNumber} · {order.itemCount} item{order.itemCount === 1 ? "" : "s"}
          </p>

          <div className="mt-6">
            <PaymentPanel
              orderId={order.id}
              orderNumber={order.orderNumber}
              total={order.total}
              currency={order.currency}
              method={(order.paymentProvider ?? "razorpay") as "razorpay" | "test"}
              email={order.email}
              phone={order.phone}
            />
          </div>
        </div>

        <p className="mt-4 text-center text-xs text-[var(--color-muted-foreground)]">
          Aurora never sees or stores your card number, CVV or banking password.
        </p>
      </div>
    </div>
  );
}
