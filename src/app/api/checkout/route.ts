import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { orders } from "@/db/schema";
import { ipFromHeaders } from "@/lib/audit";
import { AuthError, requireUser } from "@/lib/auth/authorize";
import { clientSubject, enforceRateLimit } from "@/lib/rate-limit";
import { serverEnv } from "@/lib/env";
import { parseRequest } from "@/lib/validate";
import { CheckoutError, placeOrder, writeOrderAudit } from "@/server/checkout";
import { and, eq } from "drizzle-orm";

export const runtime = "nodejs";

const addressSchema = z.object({
  fullName: z.string().trim().min(1, "Enter the recipient's name.").max(120),
  phone: z.string().trim().min(8, "Enter a phone number.").max(20),
  line1: z.string().trim().min(1, "Enter the street address.").max(200),
  line2: z.string().trim().max(200).optional().or(z.literal("")),
  city: z.string().trim().min(1, "Enter the city.").max(80),
  state: z.string().trim().min(1, "Enter the state.").max(80),
  postalCode: z.string().trim().min(4, "Enter the postal code.").max(10),
  country: z.string().trim().length(2).optional(),
  label: z.string().trim().max(40).optional(),
});

const bodySchema = z.object({
  address: addressSchema,
  saveAddress: z.boolean().optional().default(false),
  paymentMethod: z.enum(["cod", "razorpay", "test"]),
  idempotencyKey: z.string().trim().min(8).max(64),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
});

export async function POST(request: Request) {
  try {
    const user = await requireUser();

    const limit = await enforceRateLimit({
      bucket: "order",
      subject: clientSubject(request.headers, user.id),
      limit: serverEnv().RATE_LIMIT_ORDER,
      windowSeconds: 3600,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many order attempts. Please try again shortly.", code: "rate_limited" },
        { status: 429 },
      );
    }

    const parsed = await parseRequest(request, bodySchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    const data = parsed.data;
    try {
      const result = await placeOrder({
        userId: user.id,
        email: user.email,
        address: { ...data.address, line2: data.address.line2 || null },
        saveAddress: data.saveAddress,
        paymentMethod: data.paymentMethod,
        idempotencyKey: data.idempotencyKey,
        notes: data.notes || null,
        ip: ipFromHeaders(request.headers),
        userAgent: request.headers.get("user-agent"),
      });

      // A replayed submit must not log a second creation event.
      if (!result.replayed) {
        await writeOrderAudit({
          orderId: result.orderId,
          orderNumber: result.orderNumber,
          uid: user.id,
          email: user.email,
          summary: `${user.email} placed ${result.orderNumber} (${data.paymentMethod}).`,
          ip: ipFromHeaders(request.headers),
          userAgent: request.headers.get("user-agent"),
        });
      }

      return NextResponse.json(result, { status: result.replayed ? 200 : 201 });
    } catch (error) {
      if (error instanceof CheckoutError) {
        // A duplicate idempotency key means the client retried a request that
        // already succeeded — return the order that was already created.
        if (error.code === "conflict") {
          const existing = await findExistingOrder(user.id, data.idempotencyKey);
          if (existing) return NextResponse.json(existing, { status: 200 });
        }
        const status =
          error.code === "stock" || error.code === "unavailable" || error.code === "empty"
            ? 409
            : error.code === "not_configured"
              ? 503
              : 422;
        return NextResponse.json(
          { error: error.message, code: error.code, itemIds: error.itemIds },
          { status },
        );
      }
      // Unique violation on (user_id, idempotency_key): a retried submission.
      if (isUniqueViolation(error)) {
        const existing = await findExistingOrder(user.id, data.idempotencyKey);
        if (existing) return NextResponse.json(existing, { status: 200 });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[checkout] unexpected failure", error);
    return NextResponse.json(
      { error: "We could not place that order. Please try again.", code: "server_error" },
      { status: 500 },
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505"
  );
}

async function findExistingOrder(userId: string, idempotencyKey: string) {
  const [order] = await db
    .select({
      orderId: orders.id,
      orderNumber: orders.orderNumber,
      total: orders.total,
      currency: orders.currency,
      paymentMethod: orders.paymentProvider,
      status: orders.status,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.idempotencyKey, idempotencyKey)))
    .limit(1);
  if (!order) return null;
  return { ...order, paymentMethod: order.paymentMethod ?? "cod" };
}
