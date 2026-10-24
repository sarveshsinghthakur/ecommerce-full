import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { AuthError, requireUser } from "@/lib/auth/authorize";
import { parseRequest } from "@/lib/validate";
import {
  createRazorpayOrder,
  markOrderPaid,
  markOrderPaymentFailed,
  razorpayConfigured,
  verifyRazorpaySignature,
} from "@/server/payments";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["razorpay.create", "razorpay.verify", "test.confirm"]),
  orderId: z.string().min(1),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  method: z.string().trim().max(40).optional(),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const parsed = await parseRequest(request, bodySchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }
    const { action, orderId } = parsed.data;

    const [order] = await db
      .select()
      .from(orders)
      .where(and(eq(orders.id, orderId), eq(orders.userId, user.id)))
      .limit(1);
    if (!order) {
      return NextResponse.json({ error: "Order not found.", code: "not_found" }, { status: 404 });
    }
    if (order.paymentStatus === "paid") {
      return NextResponse.json({
        ok: true,
        alreadyPaid: true,
        orderNumber: order.orderNumber,
        redirect: `/orders/${order.id}`,
      });
    }

    if (action === "razorpay.create") {
      if (!razorpayConfigured()) {
        return NextResponse.json(
          { error: "Online payments are not configured.", code: "not_configured" },
          { status: 503 },
        );
      }
      if (order.paymentProvider !== "razorpay") {
        return NextResponse.json(
          { error: "This order is not set up for online payment.", code: "wrong_method" },
          { status: 409 },
        );
      }
      const created = await createRazorpayOrder({
        id: order.id,
        orderNumber: order.orderNumber,
        total: order.total,
        currency: order.currency,
      });
      await db
        .update(orders)
        .set({ paymentProvider: "razorpay", updatedAt: new Date() })
        .where(eq(orders.id, order.id));
      return NextResponse.json({ ok: true, ...created });
    }

    if (action === "razorpay.verify") {
      const signature = parsed.data.razorpaySignature ?? "";
      const providerOrderId = parsed.data.razorpayOrderId ?? "";
      const providerPaymentId = parsed.data.razorpayPaymentId ?? "";
      const valid = verifyRazorpaySignature({
        orderId: providerOrderId,
        paymentId: providerPaymentId,
        signature,
      });
      if (!valid) {
        await markOrderPaymentFailed(order.id, "Payment signature verification failed.");
        return NextResponse.json(
          { error: "We could not verify that payment.", code: "bad_signature" },
          { status: 400 },
        );
      }
      const result = await markOrderPaid({
        orderId: order.id,
        provider: "razorpay",
        providerOrderId,
        providerPaymentId,
        method: parsed.data.method ?? "razorpay",
        meta: { verified: "signature", orderNumber: order.orderNumber },
      });
      return NextResponse.json({
        ok: true,
        alreadyPaid: result.alreadyPaid,
        orderNumber: result.orderNumber,
        redirect: `/orders/${order.id}?paid=1`,
      });
    }

    // test.confirm — development-only simulated capture.
    const { serverEnv } = await import("@/lib/env");
    if (serverEnv().NODE_ENV === "production") {
      return NextResponse.json(
        { error: "Test payments are disabled in production.", code: "not_configured" },
        { status: 503 },
      );
    }
    if (order.paymentProvider !== "test") {
      return NextResponse.json(
        { error: "This order was not placed with the test method.", code: "wrong_method" },
        { status: 409 },
      );
    }
    const result = await markOrderPaid({
      orderId: order.id,
      provider: "test",
      providerOrderId: `test_${order.orderNumber}`,
      providerPaymentId: `testpay_${order.orderNumber}`,
      method: "test",
      meta: { simulated: true, orderNumber: order.orderNumber },
    });
    return NextResponse.json({
      ok: true,
      alreadyPaid: result.alreadyPaid,
      orderNumber: result.orderNumber,
      redirect: `/orders/${order.id}?paid=1`,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[payments] failure", error);
    return NextResponse.json(
      { error: "We could not process that payment.", code: "server_error" },
      { status: 500 },
    );
  }
}
