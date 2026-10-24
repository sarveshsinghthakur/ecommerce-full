import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { carts } from "@/db/schema";
import { writeAudit, ipFromHeaders } from "@/lib/audit";
import {
  AuthError,
  assertTestModeAllowed,
  identityFromIdToken,
  syncUserFromIdentity,
} from "@/lib/auth/authorize";
import { SESSION_COOKIE, createSessionPayload, signSession, sessionCookieOptions } from "@/lib/auth/session";
import { GUEST_CART_COOKIE, mergeGuestCart } from "@/lib/cart";
import { serverEnv } from "@/lib/env";
import { parseRequest } from "@/lib/validate";

export const runtime = "nodejs";

const bodySchema = z
  .object({
    idToken: z.string().min(1).optional(),
    testEmail: z.string().trim().email().optional(),
    testName: z.string().trim().max(120).optional(),
  })
  .refine((v) => Boolean(v.idToken || v.testEmail), {
    message: "Provide either an idToken or a testEmail.",
  });

/**
 * Mints our signed session cookie.
 *
 * Two mutually exclusive paths:
 *  - `idToken`  — a Firebase ID token verified with the Admin SDK.
 *  - `testEmail` — local-development shim, hard-disabled unless
 *    AUTH_TEST_MODE=true AND NODE_ENV !== production.
 */
export async function POST(request: Request) {
  try {
    const parsed = await parseRequest(request, bodySchema);
    if (!parsed.ok) {
      return NextResponse.json(
        { error: parsed.error, fieldErrors: parsed.fieldErrors },
        { status: 400 },
      );
    }

    let identity;
    let auditAction: "auth.login" | "auth.test_login" = "auth.login";

    if (parsed.data.testEmail) {
      assertTestModeAllowed();
      const email = parsed.data.testEmail.toLowerCase();
      identity = {
        uid: `test_${email}`,
        email,
        emailVerified: true,
        name: parsed.data.testName ?? "Test User",
        photo: null,
        phone: null,
      };
      auditAction = "auth.test_login";
    } else {
      identity = await identityFromIdToken(parsed.data.idToken!);
    }

    const user = await syncUserFromIdentity(identity);

    // Carry any anonymous cart over to the new session so a guest's basket
    // survives signing in.
    const guestToken = (await cookies()).get(GUEST_CART_COOKIE)?.value;
    if (guestToken) {
      try {
        const [guestCart] = await db
          .select({ id: carts.id })
          .from(carts)
          .where(eq(carts.sessionId, guestToken))
          .limit(1);
        if (guestCart) await mergeGuestCart(user.id, guestCart.id, db);
      } catch (error) {
        // A failed merge must never block sign-in; the guest cart is still
        // intact and will be retried on the next authenticated cart read.
        console.error("[auth/session] cart merge failed", error);
      }
    }

    const token = await signSession(
      createSessionPayload({
        uid: user.firebaseUid,
        email: user.email,
        name: user.displayName,
        photo: user.photoUrl,
      }),
      serverEnv().APP_SECRET,
    );

    await writeAudit(
      {
        action: auditAction,
        actorUid: user.firebaseUid,
        actorEmail: user.email,
        targetType: "user",
        targetId: user.id,
        summary: `${user.email} signed in.`,
        ip: ipFromHeaders(request.headers),
        userAgent: request.headers.get("user-agent"),
      },
      db,
    );

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.displayName,
        photo: user.photoUrl,
        emailVerified: user.emailVerified,
      },
    });
    response.cookies.set(SESSION_COOKIE, token, sessionCookieOptions());
    if (guestToken) response.cookies.delete(GUEST_CART_COOKIE);
    return response;
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: error.status },
      );
    }
    console.error("[auth/session] unexpected error", error);
    return NextResponse.json(
      { error: "Could not start a session. Try again." },
      { status: 500 },
    );
  }
}

/** Explicit sign-out: clears the cookie. Idempotent. */
export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
