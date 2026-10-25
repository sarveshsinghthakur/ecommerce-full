"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BadgeCheck, Banknote, CreditCard, FlaskConical, Truck } from "lucide-react";
import { FREE_SHIPPING_THRESHOLD, type PaymentMethod } from "@/lib/checkout-policy";
import type { CheckoutSummary, SavedAddress } from "@/lib/checkout-types";
import { useCart } from "@/components/providers";
import { Button } from "@/components/ui/button";
import { Input, Label, Textarea } from "@/components/ui/input";
import { Price } from "@/components/ui/price";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";

interface Props {
  summary: CheckoutSummary;
}

const METHOD_META: Record<
  PaymentMethod,
  { label: string; description: string; icon: React.ComponentType<{ className?: string }> }
> = {
  cod: {
    label: "Cash on delivery",
    description: "Pay in cash or by UPI when your order arrives.",
    icon: Truck,
  },
  razorpay: {
    label: "Card, UPI or netbanking",
    description: "Processed securely by Razorpay. Card details never reach Aurora.",
    icon: CreditCard,
  },
  test: {
    label: "Test payment",
    description: "Development only — simulates a successful payment instantly.",
    icon: FlaskConical,
  },
};

const BLANK_ADDRESS = {
  fullName: "",
  phone: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  label: "Home",
};

export function CheckoutForm({ summary }: Props) {
  const router = useRouter();
  const cart = useCart();
  const toast = useToast();
  const idempotencyKey = useRef<string>(crypto.randomUUID());

  const defaultAddress = summary.addresses.find((address) => address.isDefaultShipping);
  const [selectedId, setSelectedId] = useState<string>(defaultAddress?.id ?? "new");
  const [newAddress, setNewAddress] = useState(BLANK_ADDRESS);
  const [saveAddress, setSaveAddress] = useState(summary.addresses.length === 0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(
    summary.paymentMethods.includes("cod") ? "cod" : (summary.paymentMethods[0] ?? "cod"),
  );
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});

  const blocked = useMemo(() => summary.lines.filter((line) => line.blocked), [summary.lines]);
  const currency = summary.currency;

  function update(key: keyof typeof BLANK_ADDRESS, value: string) {
    setNewAddress((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  function addressFromSaved(address: SavedAddress) {
    return {
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 ?? "",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      country: address.country,
      label: address.label,
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setFieldErrors({});

    const payload = {
      address:
        selectedId === "new"
          ? { ...newAddress, line2: newAddress.line2 || "", country: "IN" }
          : addressFromSaved(summary.addresses.find((a) => a.id === selectedId)!),
      saveAddress: selectedId === "new" && saveAddress,
      paymentMethod,
      idempotencyKey: idempotencyKey.current,
      notes: notes.trim() || undefined,
    };

    setBusy(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFieldErrors(body.fieldErrors ?? {});
        setError(body.error ?? "We could not place that order.");
        if (body.code === "stock" || body.code === "unavailable") {
          toast.error(body.error ?? "Your cart needs updating.");
          await cart.refresh();
        }
        return;
      }

      await cart.refresh();
      toast.success(`Order ${body.orderNumber} placed.`);
      router.replace(
        body.paymentMethod === "cod"
          ? `/orders/${body.orderId}?placed=1`
          : `/orders/${body.orderId}/pay`,
      );
      router.refresh();
    } catch {
      setError("Network error — your order was not placed. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const fieldError = (name: string) => fieldErrors[name]?.[0];

  return (
    <form onSubmit={handleSubmit} noValidate className="grid gap-8 lg:grid-cols-[1fr_21rem]">
      <div className="flex flex-col gap-6">
        {error ? (
          <div
            role="alert"
            className="rounded-[var(--radius-control)] border border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] px-3 py-2 text-sm text-[var(--color-destructive)]"
          >
            {error}
          </div>
        ) : null}

        {blocked.length > 0 ? (
          <div
            role="alert"
            className="rounded-[var(--radius-control)] border border-[var(--color-destructive)] bg-[var(--color-destructive-soft)] px-3 py-2 text-sm text-[var(--color-destructive)]"
          >
            {blocked.length} item{blocked.length === 1 ? "" : "s"} in your cart{" "}
            {blocked.length === 1 ? "is" : "are"} unavailable —{" "}
            <Link href="/cart" className="font-medium underline">
              review your cart
            </Link>
            .
          </div>
        ) : null}

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Deliver to</h2>

          {summary.addresses.length > 0 ? (
            <div className="mt-3 flex flex-col gap-2">
              {summary.addresses.map((address) => (
                <label
                  key={address.id}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-[var(--radius-control)] border p-3 text-sm transition-colors",
                    selectedId === address.id
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:bg-[var(--color-muted)]",
                  )}
                >
                  <input
                    type="radio"
                    name="address"
                    className="mt-1 accent-[var(--color-primary)]"
                    checked={selectedId === address.id}
                    onChange={() => setSelectedId(address.id)}
                  />
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-[var(--color-foreground)]">
                        {address.fullName}
                      </span>
                      <span className="text-xs text-[var(--color-muted-foreground)]">
                        {address.label}
                      </span>
                      {address.isDefaultShipping ? (
                        <span className="rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">
                          Default
                        </span>
                      ) : null}
                    </span>
                    <span className="mt-0.5 block text-[var(--color-muted-foreground)]">
                      {address.line1}
                      {address.line2 ? `, ${address.line2}` : ""}, {address.city},{" "}
                      {address.state} {address.postalCode}
                    </span>
                    <span className="block text-[var(--color-muted-foreground)]">
                      {address.phone}
                    </span>
                  </span>
                </label>
              ))}

              <label
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-[var(--radius-control)] border p-3 text-sm",
                  selectedId === "new"
                    ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                    : "border-[var(--color-border)] hover:bg-[var(--color-muted)]",
                )}
              >
                <input
                  type="radio"
                  name="address"
                  className="accent-[var(--color-primary)]"
                  checked={selectedId === "new"}
                  onChange={() => setSelectedId("new")}
                />
                <span className="text-[var(--color-foreground)]">Ship to a new address</span>
              </label>
            </div>
          ) : (
            <p className="mt-2 text-sm text-[var(--color-muted-foreground)]">
              Add the address where this order should arrive.
            </p>
          )}

          {selectedId === "new" ? (
            <div className="mt-4 flex flex-col gap-4 border-t border-[var(--color-border)] pt-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="co-name" required>
                    Full name
                  </Label>
                  <Input
                    id="co-name"
                    value={newAddress.fullName}
                    onChange={(e) => update("fullName", e.target.value)}
                    autoComplete="name"
                    error={fieldError("address.fullName")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="co-phone" required>
                    Phone
                  </Label>
                  <Input
                    id="co-phone"
                    value={newAddress.phone}
                    onChange={(e) => update("phone", e.target.value)}
                    autoComplete="tel"
                    placeholder="+91 98765 43210"
                    error={fieldError("address.phone")}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="co-line1" required>
                  Street address
                </Label>
                <Input
                  id="co-line1"
                  value={newAddress.line1}
                  onChange={(e) => update("line1", e.target.value)}
                  autoComplete="address-line1"
                  error={fieldError("address.line1")}
                  required
                />
              </div>

              <div>
                <Label htmlFor="co-line2">Apartment, landmark (optional)</Label>
                <Input
                  id="co-line2"
                  value={newAddress.line2}
                  onChange={(e) => update("line2", e.target.value)}
                  autoComplete="address-line2"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <Label htmlFor="co-city" required>
                    City
                  </Label>
                  <Input
                    id="co-city"
                    value={newAddress.city}
                    onChange={(e) => update("city", e.target.value)}
                    autoComplete="address-level2"
                    error={fieldError("address.city")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="co-state" required>
                    State
                  </Label>
                  <Input
                    id="co-state"
                    value={newAddress.state}
                    onChange={(e) => update("state", e.target.value)}
                    autoComplete="address-level1"
                    error={fieldError("address.state")}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="co-postal" required>
                    Postal code
                  </Label>
                  <Input
                    id="co-postal"
                    value={newAddress.postalCode}
                    onChange={(e) => update("postalCode", e.target.value)}
                    autoComplete="postal-code"
                    inputMode="numeric"
                    error={fieldError("address.postalCode")}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="co-label">Save this address as</Label>
                <Input
                  id="co-label"
                  value={newAddress.label}
                  onChange={(e) => update("label", e.target.value)}
                  placeholder="Home"
                  maxLength={40}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-[var(--color-foreground)]">
                <input
                  type="checkbox"
                  className="size-4 accent-[var(--color-primary)]"
                  checked={saveAddress}
                  onChange={(e) => setSaveAddress(e.target.checked)}
                />
                Save this address to my account
              </label>
            </div>
          ) : null}
        </section>

        <section className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">Payment</h2>

          <div className="mt-3 flex flex-col gap-2">
            {summary.paymentMethods.map((method) => {
              const meta = METHOD_META[method];
              return (
                <label
                  key={method}
                  className={cn(
                    "flex cursor-pointer gap-3 rounded-[var(--radius-control)] border p-3 transition-colors",
                    paymentMethod === method
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                      : "border-[var(--color-border)] hover:bg-[var(--color-muted)]",
                  )}
                >
                  <input
                    type="radio"
                    name="payment"
                    className="mt-1 accent-[var(--color-primary)]"
                    checked={paymentMethod === method}
                    onChange={() => setPaymentMethod(method)}
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
                      <meta.icon className="size-4 text-[var(--color-primary)]" aria-hidden />
                      {meta.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                      {meta.description}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>

          <div className="mt-4">
            <Label htmlFor="co-notes">Order notes (optional)</Label>
            <Textarea
              id="co-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              placeholder="Delivery instructions, gate code…"
            />
          </div>
        </section>
      </div>

      <aside className="lg:sticky lg:top-24 lg:self-start">
        <div className="rounded-[var(--radius-card)] border border-[var(--color-border)] bg-white p-5">
          <h2 className="text-sm font-semibold text-[var(--color-foreground)]">
            Order summary
          </h2>

          <ul className="mt-3 flex max-h-72 flex-col gap-3 overflow-y-auto pr-1">
            {summary.lines.map((line) => (
              <li key={line.id} className="flex gap-3">
                <div className="size-12 shrink-0 overflow-hidden rounded-[var(--radius-control)] border border-[var(--color-border)] bg-[var(--color-muted)]">
                  {line.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={line.imageUrl}
                      alt={line.title}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 text-xs font-medium text-[var(--color-foreground)]">
                    {line.title}
                  </p>
                  <p className="text-[11px] text-[var(--color-muted-foreground)]">
                    Qty {line.quantity}
                  </p>
                </div>
                <Price
                  value={line.lineTotal}
                  currency={currency}
                  compact
                  className="shrink-0 text-xs"
                />
              </li>
            ))}
          </ul>

          <dl className="mt-4 flex flex-col gap-2 border-t border-[var(--color-border)] pt-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-muted-foreground)]">Subtotal</dt>
              <dd className="font-medium tabular-nums">
                <Price value={summary.subtotal} currency={currency} compact />
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-[var(--color-muted-foreground)]">Shipping</dt>
              <dd className="font-medium tabular-nums">
                {summary.qualifiesForFreeShipping ? (
                  <span className="text-[var(--color-success)]">Free</span>
                ) : (
                  <Price value={summary.shipping} currency={currency} compact />
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between border-t border-[var(--color-border)] pt-2.5">
              <dt className="font-semibold text-[var(--color-foreground)]">Total</dt>
              <dd className="font-semibold tabular-nums">
                <Price value={summary.total} currency={currency} />
              </dd>
            </div>
          </dl>

          {!summary.qualifiesForFreeShipping ? (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-muted-foreground)]">
              <BadgeCheck className="size-3.5 text-[var(--color-primary)]" aria-hidden />
              Add{" "}
              <Price
                value={String(FREE_SHIPPING_THRESHOLD - Number(summary.subtotal))}
                currency={currency}
                compact
              />{" "}
              for free shipping.
            </p>
          ) : (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--color-success)]">
              <Banknote className="size-3.5" aria-hidden />
              You qualify for free shipping.
            </p>
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            className="mt-4"
            loading={busy}
            disabled={blocked.length > 0}
          >
            {busy ? "Placing order…" : paymentMethod === "cod" ? "Place order" : "Continue to payment"}
          </Button>

          <p className="mt-3 text-[11px] leading-relaxed text-[var(--color-muted-foreground)]">
            By placing this order you agree to our{" "}
            <Link href="/terms-and-conditions" className="underline hover:text-[var(--color-foreground)]">
              terms
            </Link>{" "}
            and{" "}
            <Link href="/returns-and-refunds" className="underline hover:text-[var(--color-foreground)]">
              returns policy
            </Link>
            . Final prices are re-checked the moment you submit.
          </p>
        </div>
      </aside>
    </form>
  );
}
