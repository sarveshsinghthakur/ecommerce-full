import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { carts, users } from "@/db/schema";
import { writeAudit, ipFromHeaders } from "@/lib/audit";
import {
  AuthError,
  assertTestModeAllowed,
  identityFromIdToken,
  syncUserFromIdentity,
} from "@/lib/auth/authorize";
import { MIN_PASSWORD_LENGTH, hashPassword, verifyPassword } from "@/lib/auth/password";
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
    /** Dev-shim credential; required alongside testEmail. */
    testPassword: z.string().min(MIN_PASSWORD_LENGTH).max(200).optional(),
    /** Whether the dev shim is signing in or creating the account. */
    testAction: z.enum(["sign_in", "sign_up"]).optional(),
  })
  .refine((v) => Boolean(v.idToken || (v.testEmail && v.testPassword)), {
    message: "Provide either an idToken or a testEmail with a password.",
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
    /** Dev shim: hash to persist after the profile sync (sign-up / first password). */
    let passwordHashToSet: string | null = null;

    if (parsed.data.testEmail) {
      assertTestModeAllowed();
      const email = parsed.data.testEmail.toLowerCase();
      const uid = `test_${email}`;
      const action = parsed.data.testAction ?? "sign_in";
      // Scoped select: AppUser deliberately never carries the hash, so the
      // credential is read only inside this test-mode branch.
      const [existing] = await db
        .select({
          id: users.id,
          displayName: users.displayName,
          passwordHash: users.passwordHash,
        })
        .from(users)
        .where(eq(users.firebaseUid, uid))
        .limit(1);

      if (action === "sign_up") {
        // An account that already has a credential must sign in instead;
        // accounts created before passwords existed may claim one here.
        if (existing?.passwordHash) {
          throw new AuthError(
            "forbidden",
            "An account already exists for that email. Sign in instead.",
          );
        }
        passwordHashToSet = await hashPassword(parsed.data.testPassword!);
      } else {
        if (!existing) {
          throw new AuthError("unauthenticated", "No account exists for that email address.");
        }
        if (!existing.passwordHash) {
          throw new AuthError(
            "unauthenticated",
            "This account has no password yet. Create the account with this email to set one.",
          );
        }
        if (!(await verifyPassword(parsed.data.testPassword!, existing.passwordHash))) {
          throw new AuthError(
            "unauthenticated",
            "That email and password combination does not match an account.",
          );
        }
      }

      identity = {
        uid,
        email,
        emailVerified: true,
        name: parsed.data.testName ?? existing?.displayName ?? "Test User",
        photo: null,
        phone: null,
      };
      auditAction = "auth.test_login";
    } else {
      identity = await identityFromIdToken(parsed.data.idToken!);
    }

    const user = await syncUserFromIdentity(identity);

    if (passwordHashToSet) {
      await db
        .update(users)
        .set({ passwordHash: passwordHashToSet, updatedAt: new Date() })
        .where(eq(users.id, user.id));
    }

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
