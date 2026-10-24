import Link from "next/link";
import {
  AlertTriangle,
  Boxes,
  CircleDollarSign,
  Users,
} from "lucide-react";
import { adminOverview } from "@/server/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { PaymentStatusBadge, OrderStatusBadge } from "@/components/store/order-status-badge";
import { formatMoney } from "@/lib/money";
import { formatDateTime, formatRelativeTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const overview = await adminOverview();

  return (
    <div>
      <PageHeader
        title="Store overview"
        description="Live counts for the catalog, customers, and orders."
      />

      {/* Stat tiles */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<Boxes className="size-4" aria-hidden />}
          label="Products"
          value={String(overview.products.total)}
          hint={`${overview.products.published} published · ${overview.products.draft} draft · ${overview.products.needsReview} needs review`}
        />
        <StatTile
          icon={<CircleDollarSign className="size-4" aria-hidden />}
          label="Paid revenue"
          value={formatMoney(overview.paidRevenue, overview.currency)}
          hint={`${overview.orders.total} orders · ${overview.orders.open} in fulfilment`}
        />
        <StatTile
          icon={<Users className="size-4" aria-hidden />}
          label="Customers"
          value={String(overview.userCount)}
          hint={`${overview.orders.delivered} orders delivered`}
          href="/admin/orders?status=delivered"
        />
        <StatTile
          icon={<AlertTriangle className="size-4" aria-hidden />}
          label="Needs attention"
          value={String(overview.orders.problem)}
          hint={`${overview.orders.awaitingPayment} awaiting payment`}
          tone={overview.orders.problem > 0 ? "warn" : "normal"}
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        {/* Recent orders */}
        <section className="lg:col-span-3">
          <div className="mb-3 flex items-end justify-between gap-4">
            <h2 className="text-base font-semibold text-[var(--color-foreground)]">
              Recent orders
            </h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-[var(--color-primary)] hover:underline"
            >
              All orders
            </Link>
          </div>

          {overview.recentOrders.length > 0 ? (
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Customer</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {overview.recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--color-border)] last:border-0"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium tabular-nums text-[var(--color-foreground)]">
                          {order.orderNumber}
                        </p>
                        <p className="text-xs text-[var(--color-muted-foreground)]">
                          {formatDateTime(order.placedAt)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-[var(--color-foreground)]">{order.fullName}</p>
                        <p className="max-w-[180px] truncate text-xs text-[var(--color-muted-foreground)]">
                          {order.email}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-start gap-1">
                          <OrderStatusBadge status={order.status} />
                          <PaymentStatusBadge status={order.paymentStatus} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-medium tabular-nums text-[var(--color-foreground)]">
                        {formatMoney(order.total, order.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No orders yet. They will appear here the moment the first checkout completes.
            </Card>
          )}

          {/* Low stock */}
          {overview.lowStock.length > 0 ? (
            <div className="mt-6">
              <h2 className="mb-3 text-base font-semibold text-[var(--color-foreground)]">
                Low stock &amp; sold out
              </h2>
              <Card>
                <ul className="divide-y divide-[var(--color-border)]">
                  {overview.lowStock.map((product) => (
                    <li key={product.id} className="flex items-center gap-3 px-4 py-2.5">
                      <div className="size-10 shrink-0 overflow-hidden rounded-md bg-[var(--color-muted)]">
                        {product.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={product.imageUrl}
                            alt=""
                            loading="lazy"
                            referrerPolicy="no-referrer"
                            className="size-full object-cover"
                          />
                        ) : null}
                      </div>
                      <Link
                        href={`/product/${product.slug}`}
                        className="min-w-0 flex-1 truncate text-sm text-[var(--color-foreground)] hover:underline"
                      >
                        {product.title}
                      </Link>
                      <span className="shrink-0 text-xs tabular-nums text-[var(--color-muted-foreground)]">
                        {product.availability === "out_of_stock"
                          ? "Sold out"
                          : `${product.stockQuantity ?? 0} left`}
                      </span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          ) : null}
        </section>

        {/* Activity feed */}
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-base font-semibold text-[var(--color-foreground)]">
            Activity
          </h2>
          {overview.recentActivity.length > 0 ? (
            <Card>
              <ol className="divide-y divide-[var(--color-border)]">
                {overview.recentActivity.map((entry) => (
                  <li key={entry.id} className="flex gap-3 px-4 py-3">
                    <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" />
                    <div className="min-w-0">
                      <p className="break-words text-sm text-[var(--color-foreground)]">
                        {entry.summary ?? entry.action}
                      </p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        <span className="font-medium">{entry.actorEmail ?? "system"}</span>
                        {" · "}
                        {formatRelativeTime(entry.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </Card>
          ) : (
            <Card className="p-8 text-center text-sm text-[var(--color-muted-foreground)]">
              No activity recorded yet.
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  hint,
  tone = "normal",
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  tone?: "normal" | "warn";
  href?: string;
}) {
  const body = (
    <Card
      className={href ? "block p-5 transition-colors hover:border-[var(--color-border-strong)]" : "p-5"}
    >
      <div className="flex items-center gap-2 text-[var(--color-muted-foreground)]">
        <span
          className={
            tone === "warn"
              ? "grid size-8 place-items-center rounded-lg bg-amber-50 text-amber-600"
              : "grid size-8 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)]"
          }
        >
          {icon}
        </span>
        <span className="text-xs font-semibold uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums text-[var(--color-foreground)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">{hint}</p> : null}
    </Card>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
