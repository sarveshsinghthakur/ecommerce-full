import type { Metadata } from "next";
import Link from "next/link";
import { PackageOpen } from "lucide-react";
import { requireUser, AuthError } from "@/lib/auth/authorize";
import { listOrdersForUser } from "@/server/orders";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-status-badge";
import { EmptyState } from "@/components/ui/feedback";
import { Price } from "@/components/ui/price";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your orders",
  description: "Track and review every Aurora order.",
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) {
      return (
        <div className="container-page py-16">
          <EmptyState
            title="Sign in to see your orders"
            description="Your order history is tied to your account."
            action={
              <Link
                href="/login?next=/orders"
                className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
              >
                Sign in
              </Link>
            }
          />
        </div>
      );
    }
    throw error;
  }

  const orders = await listOrdersForUser(user.id);

  return (
    <div className="container-page py-8 sm:py-10">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
          Your orders
        </h1>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          {orders.length === 0
            ? "Nothing here yet."
            : `${orders.length} order${orders.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <EmptyState
          icon={<PackageOpen />}
          title="No orders yet"
          description="When you place an order it will show up here with live status updates."
          action={
            <Link
              href="/products"
              className="mt-1 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
            >
              Browse products
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/orders/${order.id}`}
                className="flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-4 transition-shadow hover:shadow-[var(--shadow-card)] sm:p-5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">
                    {order.orderNumber}
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                    {formatDate(order.placedAt)} · {order.itemCount} item
                    {order.itemCount === 1 ? "" : "s"}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <OrderStatusBadge status={order.status} />
                  <PaymentStatusBadge status={order.paymentStatus} />
                </div>

                <div className="text-right">
                  <Price value={order.total} currency={order.currency} className="text-sm" />
                  <p className="text-xs text-[var(--color-muted-foreground)]">Total</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
