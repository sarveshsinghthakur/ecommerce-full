import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin, Phone, Receipt, Truck } from "lucide-react";
import { requireUser, AuthError } from "@/lib/auth/authorize";
import { getOrderForUser } from "@/server/orders";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/store/order-status-badge";
import { Price } from "@/components/ui/price";
import { formatDate, formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

interface Params {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  return { title: `Order ${id}`, robots: { index: false, follow: false } };
}

export default async function OrderDetailPage({
  params,
  searchParams,
}: Params & { searchParams: Promise<{ placed?: string; paid?: string }> }) {
  let user;
  try {
    user = await requireUser();
  } catch (error) {
    if (error instanceof AuthError) notFound();
    throw error;
  }

  const { id } = await params;
  const { placed, paid } = await searchParams;
  const order = await getOrderForUser(user.id, id);
  if (!order) notFound();

  const needsPayment = order.paymentStatus === "pending";

  return (
    <div className="container-page py-8 sm:py-10">
      <Link
        href="/orders"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]"
      >
        <ArrowLeft className="size-4" aria-hidden />
        All orders
      </Link>

      <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-foreground)]">
            {order.orderNumber}
          </h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            Placed {formatDateTime(order.placedAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <OrderStatusBadge status={order.status} />
          <PaymentStatusBadge status={order.paymentStatus} />
        </div>
      </div>

      {placed === "1" ? (
        <div
          role="status"
          className="mt-5 rounded-[var(--radius-control)] border border-[var(--color-success)] bg-[var(--color-success-soft)] px-4 py-3 text-sm text-[var(--color-success)]"
        >
          Thank you — your order has been placed.
          {order.paymentStatus === "cod_pending"
            ? " You will pay when it arrives."
            : ""}
        </div>
      ) : null}

      {paid === "1" ? (
        <div
          role="status"
          className="mt-5 rounded-[var(--radius-control)] border border-[var(--color-success)] bg-[var(--color-success-soft)] px-4 py-3 text-sm text-[var(--color-success)]"
        >
          Payment received. Your order is confirmed.
        </div>
      ) : null}

      {needsPayment ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-800">
            This order is waiting for payment. Unpaid orders may be cancelled
            automatically.
          </p>
          <Link
            href={`/orders/${order.id}/pay`}
            className="inline-flex h-9 shrink-0 items-center rounded-[var(--radius-control)] bg-[var(--color-primary)] px-4 text-sm font-medium text-white hover:bg-[var(--color-primary-hover)]"
          >
            Pay now
          </Link>
        </div>
      ) : null}

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <Receipt className="size-4 text-[var(--color-primary)]" aria-hidden />
              Items
            </h2>

            <ul className="mt-4 flex flex-col divide-y divide-[var(--color-border)]">
              {order.items.map((item) => (
                <li key={item.id} className="flex gap-4 py-3 first:pt-0 last:pb-0">
                  <Link
                    href={`/product/${item.productSlug}`}
                    className="size-16 shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-muted)]"
                  >
                    {item.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.imageUrl}
                        alt=""
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        className="size-full object-cover"
                      />
                    ) : null}
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/product/${item.productSlug}`}
                      className="line-clamp-2 text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-primary)]"
                    >
                      {item.title}
                    </Link>
                    {item.variantName ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {item.variantName}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-xs text-[var(--color-muted-foreground)]">
                      Qty {item.quantity} ×{" "}
                      <Price value={item.unitPrice} currency={order.currency} compact />
                      {item.markupPercent ? (
                        <> · {Number(item.markupPercent)}% store markup</>
                      ) : null}
                    </p>
                  </div>
                  <Price
                    value={item.lineTotal}
                    currency={order.currency}
                    className="shrink-0 text-sm"
                  />
                </li>
              ))}
            </ul>

            <dl className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted-foreground)]">Subtotal</dt>
                <dd className="tabular-nums">
                  <Price value={order.subtotal} currency={order.currency} compact />
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-[var(--color-muted-foreground)]">Shipping</dt>
                <dd className="tabular-nums">
                  {Number(order.shippingAmount) === 0 ? (
                    <span className="text-[var(--color-success)]">Free</span>
                  ) : (
                    <Price value={order.shippingAmount} currency={order.currency} compact />
                  )}
                </dd>
              </div>
              <div className="flex justify-between border-t border-[var(--color-border)] pt-2.5">
                <dt className="font-semibold text-[var(--color-foreground)]">Total</dt>
                <dd className="font-semibold tabular-nums">
                  <Price value={order.total} currency={order.currency} />
                </dd>
              </div>
            </dl>
          </section>

          <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <Truck className="size-4 text-[var(--color-primary)]" aria-hidden />
              Status history
            </h2>
            <ol className="mt-4 flex flex-col gap-3">
              {order.history.map((entry) => (
                <li key={entry.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden />
                  <div>
                    <p className="font-medium text-[var(--color-foreground)]">
                      {entry.toStatus.replace(/_/g, " ")}
                    </p>
                    {entry.note ? (
                      <p className="text-xs text-[var(--color-muted-foreground)]">{entry.note}</p>
                    ) : null}
                    <p className="text-xs text-[var(--color-muted-foreground)]">
                      {formatDateTime(entry.createdAt)} · {entry.actor}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-[var(--color-foreground)]">
              <MapPin className="size-4 text-[var(--color-primary)]" aria-hidden />
              Shipping address
            </h2>
            <address className="mt-3 not-italic text-sm leading-relaxed text-[var(--color-muted-foreground)]">
              <span className="font-medium text-[var(--color-foreground)]">
                {order.shippingAddress.fullName}
              </span>
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 ? (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              ) : null}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.state}{" "}
              {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.country}
            </address>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-[var(--color-muted-foreground)]">
              <Phone className="size-3.5" aria-hidden />
              {order.phone}
            </p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5 text-sm">
            <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Delivery</h2>
            <p className="mt-2 text-[var(--color-muted-foreground)]">
              Dispatch within 24 hours on business days. Estimated delivery{" "}
              <span className="font-medium text-[var(--color-foreground)]">
                {formatDate(new Date(order.placedAt.getTime() + 4 * 86400000))}
              </span>
              .
            </p>
            <p className="mt-3 text-xs text-[var(--color-muted-foreground)]">
              Questions about this order?{" "}
              <Link
                href="/contact"
                className="font-medium text-[var(--color-primary)] hover:underline"
              >
                Contact us
              </Link>{" "}
              and quote {order.orderNumber}.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
