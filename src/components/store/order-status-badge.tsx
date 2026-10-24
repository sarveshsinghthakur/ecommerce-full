import { cn } from "@/lib/cn";

const ORDER_TONES: Record<string, string> = {
  pending_payment: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-sky-50 text-sky-700 border-sky-200",
  processing: "bg-indigo-50 text-indigo-700 border-indigo-200",
  shipped: "bg-violet-50 text-violet-700 border-violet-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled: "bg-zinc-100 text-zinc-600 border-zinc-200",
  payment_failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-zinc-100 text-zinc-600 border-zinc-200",
};

const PAYMENT_TONES: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-red-50 text-red-700 border-red-200",
  refunded: "bg-zinc-100 text-zinc-600 border-zinc-200",
  cod_pending: "bg-sky-50 text-sky-700 border-sky-200",
};

const ORDER_LABELS: Record<string, string> = {
  pending_payment: "Awaiting payment",
  confirmed: "Confirmed",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  payment_failed: "Payment failed",
  refunded: "Refunded",
};

const PAYMENT_LABELS: Record<string, string> = {
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  cod_pending: "Pay on delivery",
};

function chip(label: string, tone: string) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        tone,
      )}
    >
      {label}
    </span>
  );
}

export function OrderStatusBadge({ status }: { status: string }) {
  return chip(
    ORDER_LABELS[status] ?? status,
    ORDER_TONES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
  );
}

export function PaymentStatusBadge({ status }: { status: string }) {
  return chip(
    PAYMENT_LABELS[status] ?? status,
    PAYMENT_TONES[status] ?? "bg-zinc-100 text-zinc-600 border-zinc-200",
  );
}
