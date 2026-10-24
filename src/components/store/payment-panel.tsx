"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, FlaskConical, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthNotice } from "@/components/auth/auth-shell";

interface Props {
  orderId: string;
  orderNumber: string;
  total: string;
  currency: string;
  method: "razorpay" | "test";
  email: string;
  phone: string;
}

interface RazorpayHandlerResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on: (event: string, handler: (response: unknown) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>("script[data-razorpay]");
    if (existing) {
      existing.addEventListener("load", () => resolve(Boolean(window.Razorpay)));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.dataset.razorpay = "true";
    script.onload = () => resolve(Boolean(window.Razorpay));
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function PaymentPanel(props: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "razorpay" | "test">(null);
  const [error, setError] = useState<string | null>(null);

  async function post(payload: Record<string, unknown>) {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId: props.orderId, ...payload }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.error ?? "Payment could not be started.");
    return body;
  }

  async function handleRazorpay() {
    if (busy) return;
    setError(null);
    setBusy("razorpay");
    try {
      const created = await post({ action: "razorpay.create" });
      const loaded = await loadRazorpayScript();
      if (!loaded || !window.Razorpay) {
        throw new Error("The payment widget could not be loaded. Check your connection.");
      }

      const instance = new window.Razorpay({
        key: created.keyId,
        amount: created.amount,
        currency: created.currency,
        name: "Aurora",
        description: props.orderNumber,
        order_id: created.providerOrderId,
        prefill: { email: props.email, contact: props.phone },
        theme: { color: "#4f46e5" },
        modal: { ondismiss: () => setBusy(null) },
        handler: async (response: RazorpayHandlerResponse) => {
          try {
            const verified = await post({
              action: "razorpay.verify",
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            router.replace(verified.redirect ?? `/orders/${props.orderId}?paid=1`);
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Payment verification failed.");
            setBusy(null);
          }
        },
      });

      instance.on("payment.failed", (response: unknown) => {
        const description = (response as { error?: { description?: string } })?.error
          ?.description;
        setError(description ?? "The payment was declined. Try another method.");
        setBusy(null);
      });

      instance.open();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(null);
    }
  }

  async function handleTest() {
    if (busy) return;
    setError(null);
    setBusy("test");
    try {
      const result = await post({ action: "test.confirm" });
      router.replace(result.redirect ?? `/orders/${props.orderId}?paid=1`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not confirm the payment.");
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <AuthNotice>{error}</AuthNotice> : null}

      {props.method === "razorpay" ? (
        <>
          <Button fullWidth size="lg" loading={busy === "razorpay"} onClick={handleRazorpay}>
            {!busy && <CreditCard className="size-4" aria-hidden />}
            {busy === "razorpay" ? "Opening payment…" : `Pay ${props.currency} ${props.total}`}
          </Button>
          <p className="flex items-start gap-2 text-xs text-[var(--color-muted-foreground)]">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-[var(--color-success)]" aria-hidden />
            You will be redirected to Razorpay to complete this payment securely.
          </p>
        </>
      ) : (
        <>
          <Button fullWidth size="lg" loading={busy === "test"} onClick={handleTest}>
            {!busy && <FlaskConical className="size-4" aria-hidden />}
            {busy === "test" ? "Confirming…" : "Simulate successful payment"}
          </Button>
          <p className="text-xs text-[var(--color-muted-foreground)]">
            Development environment: this marks the order as paid without moving
            any money, so the full order flow can be exercised locally.
          </p>
        </>
      )}
    </div>
  );
}
