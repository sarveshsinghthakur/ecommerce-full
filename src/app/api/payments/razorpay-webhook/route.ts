import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import {
  auroraOrderIdFromPayload,
  markOrderPaid,
  verifyRazorpayWebhook,
} from "@/server/payments";

export const runtime = "nodejs";

/**
 * Razorpay webhook receiver.
 *
 * Verification uses the raw request body, exactly as Razorpay signs it, so the
 * handler must read `request.text()` and never a parsed object. Every event is
 * idempotent: replays report `alreadyPaid` and change nothing.
 */
export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyRazorpayWebhook(raw, signature)) {
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Malformed payload." }, { status: 400 });
  }

  const event = (payload as { event?: string }).event ?? "";
  const orderId = auroraOrderIdFromPayload(
    (payload as { payload?: { payment?: { entity?: unknown } } }).payload?.payment?.entity ??
      payload,
  );

  if (!orderId) {
    // Not an order we recognise (e.g. an unrelated subscription event) — ack so
    // Razorpay stops retrying.
    return NextResponse.json({ ok: true, ignored: true });
  }

  const [order] = await db
    .select({ id: orders.id })
    .from(orders)
    .where(eq(orders.id, orderId))
    .limit(1);
  if (!order) return NextResponse.json({ ok: true, ignored: true });

  if (event === "payment.failed") {
    const entity = (payload as { payload?: { payment?: { entity?: Record<string, unknown> } } })
      .payload?.payment?.entity;
    const description = String(entity?.error_description ?? entity?.error ?? "Payment failed.");
    const { markOrderPaymentFailed } = await import("@/server/payments");
    await markOrderPaymentFailed(order.id, description);
    return NextResponse.json({ ok: true });
  }

  if (event !== "payment.captured") {
    return NextResponse.json({ ok: true, ignored: true });
  }

  const entity = (payload as { payload?: { payment?: { entity?: Record<string, unknown> } } })
    .payload?.payment?.entity;
  const providerPaymentId = String(entity?.id ?? "");
  const providerOrderId = String(entity?.order_id ?? "");

  await markOrderPaid({
    orderId: order.id,
    provider: "razorpay",
    providerOrderId: providerOrderId || null,
    providerPaymentId: providerPaymentId || null,
    method: typeof entity?.method === "string" ? entity.method : "razorpay",
    meta: { event, capturedAt: new Date().toISOString() },
  });

  return NextResponse.json({ ok: true });
}
