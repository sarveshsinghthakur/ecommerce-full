import "server-only";

import { and, eq } from "drizzle-orm";
import { createHmac, timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { orderStatusHistory, orders, payments } from "@/db/schema";
import { serverEnv } from "@/lib/env";
import { newId } from "@/lib/ids";

export type PaymentProvider = "razorpay" | "test" | "cod";

export interface MarkPaidInput {
  orderId: string;
  provider: PaymentProvider;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  method?: string | null;
  meta?: Record<string, unknown>;
}

export interface MarkPaidResult {
  ok: boolean;
  alreadyPaid: boolean;
  orderNumber: string;
}

/**
 * Transitions an order to paid/confirmed.
 *
 * Idempotent: a replayed webhook or a double-clicked retry reports
 * `alreadyPaid` instead of applying the transition twice, so the status
 * history never grows duplicate entries.
 */
export async function markOrderPaid(input: MarkPaidInput): Promise<MarkPaidResult> {
  return db.transaction(async (tx) => {
    const [order] = await tx
      .select({ id: orders.id, orderNumber: orders.orderNumber, paymentStatus: orders.paymentStatus })
      .from(orders)
      .where(eq(orders.id, input.orderId))
      .limit(1);
    if (!order) return { ok: false, alreadyPaid: false, orderNumber: "" };

    if (order.paymentStatus === "paid") {
      return { ok: true, alreadyPaid: true, orderNumber: order.orderNumber };
    }

    await tx
      .update(orders)
      .set({
        status: "confirmed",
        paymentStatus: "paid",
        paymentProvider: input.provider,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, order.id));

    const [payment] = await tx
      .select({ id: payments.id })
      .from(payments)
      .where(and(eq(payments.orderId, order.id), eq(payments.provider, input.provider)))
      .orderBy(payments.createdAt)
      .limit(1);

    if (payment) {
      await tx
        .update(payments)
        .set({
          providerOrderId: input.providerOrderId ?? null,
          providerPaymentId: input.providerPaymentId ?? null,
          status: "paid",
          method: input.method ?? input.provider,
          meta: input.meta ?? null,
          updatedAt: new Date(),
        })
        .where(eq(payments.id, payment.id));
    } else {
      await tx.insert(payments).values({
        id: newId("pay"),
        orderId: order.id,
        provider: input.provider,
        providerOrderId: input.providerOrderId ?? null,
        providerPaymentId: input.providerPaymentId ?? null,
        amount: "0.00",
        currency: "INR",
        status: "paid",
        method: input.method ?? input.provider,
        meta: input.meta ?? null,
      });
    }

    await tx.insert(orderStatusHistory).values({
      id: newId("osh"),
      orderId: order.id,
      fromStatus: order.paymentStatus,
      toStatus: "confirmed",
      note: `Payment received via ${input.provider}.`,
      actor: "system",
    });

    return { ok: true, alreadyPaid: false, orderNumber: order.orderNumber };
  });
}

/** Marks an online payment as failed without touching an already-paid order. */
export async function markOrderPaymentFailed(orderId: string, reason: string): Promise<void> {
  const [order] = await db
    .select({ paymentStatus: orders.paymentStatus })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order || order.paymentStatus === "paid") return;

  await db
    .update(orders)
    .set({ status: "payment_failed", paymentStatus: "failed", updatedAt: new Date() })
    .where(eq(orders.id, orderId));

  await db.insert(orderStatusHistory).values({
    id: newId("osh"),
    orderId,
    fromStatus: order.paymentStatus,
    toStatus: "payment_failed",
    note: reason.slice(0, 300),
    actor: "system",
  });
}

/* --------------------------------- Razorpay -------------------------------- */

export function razorpayConfigured(): boolean {
  const env = serverEnv();
  return Boolean(env.RAZORPAY_KEY_ID && env.RAZORPAY_KEY_SECRET);
}

/** Amount in the smallest currency unit (paise for INR), as Razorpay expects. */
export function toProviderAmount(amount: string, currency: string): number {
  const value = Number(amount);
  if (!Number.isFinite(value)) return 0;
  return currency.toUpperCase() === "INR" ? Math.round(value * 100) : Math.round(value);
}

async function razorpayFetch(path: string, body: unknown): Promise<Record<string, unknown>> {
  const env = serverEnv();
  const auth = Buffer.from(`${env.RAZORPAY_KEY_ID}:${env.RAZORPAY_KEY_SECRET}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    const description =
      typeof data.error === "object" && data.error && "description" in data.error
        ? String((data.error as { description: unknown }).description)
        : `Razorpay returned ${res.status}`;
    throw new Error(description);
  }
  return data;
}

export async function createRazorpayOrder(order: {
  id: string;
  orderNumber: string;
  total: string;
  currency: string;
}): Promise<{ providerOrderId: string; amount: number; currency: string; keyId: string }> {
  const env = serverEnv();
  const created = await razorpayFetch("/orders", {
    amount: toProviderAmount(order.total, order.currency),
    currency: order.currency.toUpperCase(),
    receipt: order.orderNumber,
    notes: { aurora_order_id: order.id, aurora_order_number: order.orderNumber },
  });
  return {
    providerOrderId: String(created.id),
    amount: Number(created.amount ?? toProviderAmount(order.total, order.currency)),
    currency: String(created.currency ?? order.currency),
    keyId: env.RAZORPAY_KEY_ID,
  };
}

/** HMAC signature check for the checkout redirect callback. */
export function verifyRazorpaySignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const env = serverEnv();
  if (!env.RAZORPAY_KEY_SECRET || !opts.signature) return false;
  const expected = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${opts.orderId}|${opts.paymentId}`)
    .digest("hex");
  return safeEqual(expected, opts.signature);
}

/** HMAC signature check for webhook payloads (constant time). */
export function verifyRazorpayWebhook(body: string, signature: string): boolean {
  const env = serverEnv();
  if (!env.RAZORPAY_WEBHOOK_SECRET || !signature) return false;
  const expected = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");
  return safeEqual(expected, signature);
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/** Resolves the Aurora order id referenced by a Razorpay payload. */
export function auroraOrderIdFromPayload(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const notes = (payload as { notes?: Record<string, unknown> }).notes;
  if (notes && typeof notes.aurora_order_id === "string") return notes.aurora_order_id;
  const orderEntity = (payload as { order?: unknown }).order;
  if (orderEntity && typeof orderEntity === "object") {
    const nestedNotes = (orderEntity as { notes?: Record<string, unknown> }).notes;
    if (nestedNotes && typeof nestedNotes.aurora_order_id === "string")
      return nestedNotes.aurora_order_id;
  }
  return null;
}
