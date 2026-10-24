import "server-only";

import type { NextResponse } from "next/server";
import { getOrCreateCart, GUEST_CART_COOKIE, GUEST_CART_MAX_AGE } from "./index";
import { loadUserByUid } from "@/lib/auth/authorize";
import { readCookie, verifySession } from "@/lib/auth/session";
import { serverEnv } from "@/lib/env";

export interface CartRequestContext {
  /** Owned cart id for the signed-in user, or the anonymous cart id. */
  cartId: string;
  kind: "user" | "guest";
  /** Present only when the caller is anonymous. */
  guestToken: string | null;
  /** Non-null when this request minted a brand-new guest token. */
  mintedGuestToken: string | null;
}

/**
 * Resolves (and, for first-time visitors, creates) the cart that this request
 * should operate on.
 *
 * Reads the request's `Cookie` header directly rather than the response-scoped
 * `cookies()` store, so the caller decides when — and whether — a guest token
 * is written back.
 */
export async function loadCartContext(
  request: Request,
): Promise<CartRequestContext> {
  const header = request.headers.get("cookie");
  const payload = await verifySession(
    readCookie(header, "aurora_session"),
    serverEnv().APP_SECRET,
  );
  const user = payload ? await loadUserByUid(payload.uid) : null;

  if (user) {
    const cart = await getOrCreateCart({ userId: user.id });
    return { cartId: cart.id, kind: "user", guestToken: null, mintedGuestToken: null };
  }

  const existing = readCookie(header, GUEST_CART_COOKIE);
  const cart = await getOrCreateCart({ guestToken: existing });
  return {
    cartId: cart.id,
    kind: "guest",
    guestToken: cart.sessionId,
    mintedGuestToken: existing === cart.sessionId ? null : cart.sessionId,
  };
}

/** Attaches a newly minted guest cart token to a response, if one was created. */
export function attachGuestCookie(
  response: NextResponse,
  ctx: CartRequestContext,
): NextResponse {
  if (ctx.mintedGuestToken) {
    response.cookies.set(GUEST_CART_COOKIE, ctx.mintedGuestToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: GUEST_CART_MAX_AGE,
    });
  }
  return response;
}
