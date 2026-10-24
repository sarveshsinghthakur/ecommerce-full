import { NextResponse } from "next/server";
import { z } from "zod";
import {
  CartError,
  addToCart,
  clearCart,
  getCartView,
} from "@/lib/cart";
import { attachGuestCookie, loadCartContext } from "@/lib/cart/context";
import { enforceRateLimit, clientSubject } from "@/lib/rate-limit";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

const addSchema = z.object({
  productId: z.string().min(1).max(64),
  variantId: z.string().min(1).max(64).nullable().optional(),
  quantity: z.number().int().min(1).max(10).optional(),
});

function errorResponse(error: unknown): NextResponse {
  if (error instanceof CartError) {
    const status =
      error.code === "not_found"
        ? 404
        : error.code === "unavailable" || error.code === "line_limit"
          ? 409
          : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("[cart] unexpected error", error);
  return NextResponse.json(
    { error: "Something went wrong with your cart." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  try {
    const ctx = await loadCartContext(request);
    const view = await getCartView(ctx.cartId, ctx.kind);
    return attachGuestCookie(NextResponse.json(view), ctx);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = await parseRequest(request, addSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const ctx = await loadCartContext(request);
    const limit = await enforceRateLimit({
      bucket: "cart",
      subject: clientSubject(request.headers),
      limit: 120,
      windowSeconds: 60,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many cart updates. Try again shortly." },
        { status: 429 },
      );
    }

    const view = await addToCart(ctx.cartId, parsed.data);
    return attachGuestCookie(NextResponse.json(view), ctx);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await loadCartContext(request);
    await clearCart(ctx.cartId);
    const view = await getCartView(ctx.cartId, ctx.kind);
    return attachGuestCookie(NextResponse.json(view), ctx);
  } catch (error) {
    return errorResponse(error);
  }
}
