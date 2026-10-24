import Link from "next/link";
import { adminListOrders, ORDER_STATUSES } from "@/server/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { OrderStatusBadge, PaymentStatusBadge } from "@/components/store/order-status-badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

const LABELS = {
  all: "All",
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
} as const;

interface SearchParams {
  status?: string;
  page?: string;
}

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = (ORDER_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof ORDER_STATUSES)[number])
    : "all";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await adminListOrders({
    status: status === "all" ? null : status,
    page,
  });

  function withParams(next: Record<string, string | null>): string {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    if (page > 1) params.set("page", String(page));
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/admin/orders?${qs}` : "/admin/orders";
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description={`${result.total} order${result.total === 1 ? "" : "s"} placed on the store.`}
      />

      {/* Status filter tabs */}
      <nav className="mb-5 flex flex-wrap gap-1" aria-label="Filter by order status">
        {ORDER_STATUSES.map((key) => (
          <Link
            key={key}
            href={withParams({ status: key, page: null })}
            aria-current={key === status ? "true" : undefined}
            className={cn(
              "rounded-md px-2.5 py-1.5 text-sm transition-colors",
              key === status
                ? "bg-[var(--color-primary)] font-medium text-white"
                : "text-[var(--color-muted-foreground)] hover:bg-white hover:text-[var(--color-foreground)]",
            )}
          >
            {LABELS[key]}
          </Link>
        ))}
      </nav>

      {result.items.length > 0 ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Order</th>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Payment</th>
                  <th className="px-4 py-3 text-right font-medium">Items</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[var(--color-foreground)]">
                        {order.orderNumber}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        {formatDateTime(order.placedAt)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[var(--color-foreground)]">{order.fullName}</p>
                      <p className="max-w-[200px] truncate text-xs text-[var(--color-muted-foreground)]">
                        {order.email}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <OrderStatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3">
                      <PaymentStatusBadge status={order.paymentStatus} />
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-muted-foreground)]">
                      {order.itemCount}
                    </td>
                    <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                      {formatMoney(order.total, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>

          {result.pageCount > 1 ? (
            <nav
              aria-label="Pagination"
              className="mt-6 flex items-center justify-center gap-3"
            >
              <Link
                href={withParams({ page: String(result.page - 1) })}
                aria-disabled={result.page <= 1}
                className={cn(
                  "rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm",
                  result.page <= 1
                    ? "pointer-events-none opacity-50"
                    : "text-[var(--color-foreground)] hover:bg-white",
                )}
              >
                Previous
              </Link>
              <span className="text-sm text-[var(--color-muted-foreground)]">
                Page {result.page} of {result.pageCount}
              </span>
              <Link
                href={withParams({ page: String(result.page + 1) })}
                aria-disabled={result.page >= result.pageCount}
                className={cn(
                  "rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm",
                  result.page >= result.pageCount
                    ? "pointer-events-none opacity-50"
                    : "text-[var(--color-foreground)] hover:bg-white",
                )}
              >
                Next
              </Link>
            </nav>
          ) : null}
        </>
      ) : (
        <Card className="p-10 text-center text-sm text-[var(--color-muted-foreground)]">
          No orders with this status yet.
        </Card>
      )}
    </div>
  );
}
