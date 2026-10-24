import Link from "next/link";
import { Search } from "lucide-react";
import {
  adminListProducts,
  PRODUCT_STATUSES,
  PRODUCT_STATUS_LABELS,
} from "@/server/admin";
import { Card, PageHeader } from "@/components/ui/card";
import { formatMoney } from "@/lib/money";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

interface SearchParams {
  status?: string;
  q?: string;
  page?: string;
}

function statusChip(label: string) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--color-border)] bg-[var(--color-muted)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
      {label}
    </span>
  );
}

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const status = (PRODUCT_STATUSES as readonly string[]).includes(sp.status ?? "")
    ? (sp.status as (typeof PRODUCT_STATUSES)[number])
    : "all";
  const q = sp.q?.slice(0, 80) ?? "";
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const result = await adminListProducts({
    status: status === "all" ? null : status,
    q: q || null,
    page,
  });

  function withParams(next: Record<string, string | null>): string {
    const params = new URLSearchParams();
    const merged: Record<string, string | null> = {
      status,
      q: q || null,
      page: page > 1 ? String(page) : null,
      ...next,
    };
    for (const [key, value] of Object.entries(merged)) {
      if (value) params.set(key, value);
    }
    const qs = params.toString();
    return qs ? `/admin/products?${qs}` : "/admin/products";
  }

  return (
    <div>
      <PageHeader
        title="Products"
        description={`${result.total} product${result.total === 1 ? "" : "s"} in the catalog, across all statuses.`}
      />

      {/* Filters */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav className="flex flex-wrap gap-1" aria-label="Filter by status">
          {PRODUCT_STATUSES.map((key) => (
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
              {PRODUCT_STATUS_LABELS[key]}
            </Link>
          ))}
        </nav>

        <form action="/admin/products" className="flex items-center gap-2">
          <input type="hidden" name="status" value={status} />
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-muted-foreground)]"
              aria-hidden
            />
            <input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search title or brand"
              className="h-9 w-56 rounded-[var(--radius-control)] border border-[var(--color-input)] pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>
          <button
            type="submit"
            className="h-9 rounded-[var(--radius-control)] border border-[var(--color-border-strong)] px-3 text-sm font-medium hover:bg-white"
          >
            Search
          </button>
        </form>
      </div>

      {result.items.length > 0 ? (
        <>
          <Card className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-left text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">
                  <th className="px-4 py-3 font-medium">Product</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Stock</th>
                  <th className="px-4 py-3 font-medium">Availability</th>
                </tr>
              </thead>
              <tbody>
                {result.items.map((product) => (
                  <tr
                    key={product.id}
                    className="border-b border-[var(--color-border)] last:border-0"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
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
                        <div className="min-w-0">
                          <Link
                            href={`/product/${product.slug}`}
                            className="block max-w-[280px] truncate font-medium text-[var(--color-foreground)] hover:underline"
                          >
                            {product.title}
                          </Link>
                          <p className="text-xs text-[var(--color-muted-foreground)]">
                            {product.brand ?? "—"}
                            {product.categorySlug ? ` · ${product.categorySlug}` : ""}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusChip(PRODUCT_STATUS_LABELS[product.status] ?? product.status)}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-foreground)]">
                      {formatMoney(product.sellingPrice, product.currency)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-[var(--color-foreground)]">
                      {product.stockQuantity ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
                          product.availability === "out_of_stock"
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-emerald-200 bg-emerald-50 text-emerald-700",
                        )}
                      >
                        {product.availability.replace(/_/g, " ")}
                      </span>
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
          No products match this filter. {q ? `Nothing found for “${q}”.` : null}
        </Card>
      )}
    </div>
  );
}
