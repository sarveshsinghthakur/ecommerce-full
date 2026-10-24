import { NextResponse } from "next/server";
import { z } from "zod";
import { CartError, removeCartItem, updateCartItem } from "@/lib/cart";
import { attachGuestCookie, loadCartContext } from "@/lib/cart/context";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

const patchSchema = z.object({
  quantity: z.number().int().min(0).max(10),
});

export interface Params {
  params: Promise<{ id: string }>;
}

function errorResponse(error: unknown): NextResponse {
  if (error instanceof CartError) {
    const status = error.code === "not_found" ? 404 : 400;
    return NextResponse.json({ error: error.message, code: error.code }, { status });
  }
  console.error("[cart/item] unexpected error", error);
  return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const parsed = await parseRequest(request, patchSchema);
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const ctx = await loadCartContext(request);
    const view = await updateCartItem(ctx.cartId, id, parsed.data.quantity);
    return attachGuestCookie(NextResponse.json(view), ctx);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    const { id } = await params;
    const ctx = await loadCartContext(_request);
    const view = await removeCartItem(ctx.cartId, id);
    return attachGuestCookie(NextResponse.json(view), ctx);
  } catch (error) {
    return errorResponse(error);
  }
}
