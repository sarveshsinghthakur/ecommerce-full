import "server-only";

import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { adminRoles, orderItems, orders, users } from "@/db/schema";
import { parseList, serverEnv } from "@/lib/env";
import { newId } from "@/lib/ids";
import { firebaseAdminConfigured, verifyIdToken } from "./firebase-admin";
import { verifyIdTokenWithPublicKeys } from "./id-token";
import {
  SESSION_COOKIE,
  type SessionPayload,
  verifySession,
} from "./session";

export type AuthErrorCode =
  | "unauthenticated"
  | "forbidden"
  | "admin_not_configured"
  | "account_disabled";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  readonly status: 401 | 403;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
    this.status = code === "unauthenticated" ? 401 : 403;
  }
}

export interface AppUser {
  id: string;
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  displayName: string | null;
  photoUrl: string | null;
  phone: string | null;
  disabled: boolean;
}

export interface AdminContext {
  user: AppUser;
  /** How admin rights were established, for the audit log. */
  grant: "owner_env" | "delegated_role";
}

/* -------------------------------------------------------------------------- */
/* Environment-driven admin bootstrap                                          */
/* -------------------------------------------------------------------------- */

export function adminConfigured(): boolean {
  const env = serverEnv();
  return parseList(env.ADMIN_EMAILS).length > 0 || parseList(env.ADMIN_UIDS).length > 0;
}

/** True when the identity is pinned by the deployment configuration itself. */
export function isOwnerIdentity(uid: string, email: string): boolean {
  const env = serverEnv();
  const normalisedEmail = email.trim().toLowerCase();
  if (normalisedEmail && parseList(env.ADMIN_EMAILS).includes(normalisedEmail)) return true;
  if (uid && parseList(env.ADMIN_UIDS).includes(uid.toLowerCase())) return true;
  return false;
}

export function adminSetupHint(): string {
  return (
    "Admin access is not configured. Add the owner address to ADMIN_EMAILS " +
    "(and optionally the Firebase UID to ADMIN_UIDS) in .env.local, then restart. " +
    "Access fails closed while both are empty."
  );
}

/* -------------------------------------------------------------------------- */
/* Session resolution                                                          */
/* -------------------------------------------------------------------------- */

export async function readSessionPayload(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  return verifySession(token, serverEnv().APP_SECRET);
}

export async function getOptionalUser(): Promise<AppUser | null> {
  const payload = await readSessionPayload();
  if (!payload) return null;
  return loadUserByUid(payload.uid);
}

export async function requireUser(): Promise<AppUser> {
  const payload = await readSessionPayload();
  if (!payload) {
    throw new AuthError("unauthenticated", "Sign in to continue.");
  }
  const user = await loadUserByUid(payload.uid);
  if (!user) {
    throw new AuthError("unauthenticated", "Your account could not be found. Sign in again.");
  }
  if (user.disabled) {
    throw new AuthError("account_disabled", "This account has been disabled.");
  }
  return user;
}

/**
 * Non-throwing variant of {@link requireAdmin} for rendering UI chrome.
 * Returns `null` when the caller is not an administrator.
 */
export async function resolveAdmin(user: AppUser): Promise<AdminContext | null> {
  if (!adminConfigured()) return null;
  if (isOwnerIdentity(user.firebaseUid, user.email)) {
    return { user, grant: "owner_env" };
  }
  const [grant] = await db
    .select()
    .from(adminRoles)
    .where(eq(adminRoles.userId, user.id))
    .limit(1);
  return grant ? { user, grant: "delegated_role" } : null;
}

export async function requireAdmin(): Promise<AdminContext> {
  if (!adminConfigured()) {
    throw new AuthError("admin_not_configured", adminSetupHint());
  }
  const user = await requireUser();
  const admin = await resolveAdmin(user);
  if (admin) return admin;
  throw new AuthError("forbidden", "You do not have access to the admin area.");
}

/* -------------------------------------------------------------------------- */
/* Identity -> Postgres profile                                                */
/* -------------------------------------------------------------------------- */

export function loadUserByUid(uid: string): Promise<AppUser | null> {
  return findUserByUid(db, uid);
}

export async function findUserByUid(
  executor: typeof db,
  uid: string,
): Promise<AppUser | null> {
  const [row] = await executor
    .select()
    .from(users)
    .where(eq(users.firebaseUid, uid))
    .limit(1);
  if (!row) return null;
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    emailVerified: row.emailVerified,
    displayName: row.displayName,
    photoUrl: row.photoUrl,
    phone: row.phone,
    disabled: row.disabled,
  };
}

export interface IdentityRecord {
  uid: string;
  email: string;
  emailVerified?: boolean;
  name?: string | null;
  photo?: string | null;
  phone?: string | null;
}

/**
 * Creates or refreshes the local profile mirror for a verified identity.
 * Never elevates `role` — administrator status is not stored in this table as
 * an authorisation source.
 */
export async function syncUserFromIdentity(identity: IdentityRecord): Promise<AppUser> {
  const email = identity.email.trim().toLowerCase();
  const now = new Date();

  const [existing] = await db
    .select()
    .from(users)
    .where(eq(users.firebaseUid, identity.uid))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(users)
      .set({
        email: email || existing.email,
        emailVerified: identity.emailVerified ?? existing.emailVerified,
        displayName: identity.name ?? existing.displayName,
        photoUrl: identity.photo ?? existing.photoUrl,
        phone: identity.phone ?? existing.phone,
        lastLoginAt: now,
        updatedAt: now,
      })
      .where(eq(users.id, existing.id))
      .returning();
    return toAppUser(updated!);
  }

  const id = newId("usr");
  const [created] = await db
    .insert(users)
    .values({
      id,
      firebaseUid: identity.uid,
      email: email || `${identity.uid}@placeholder.invalid`,
      emailVerified: identity.emailVerified ?? false,
      displayName: identity.name ?? null,
      photoUrl: identity.photo ?? null,
      phone: identity.phone ?? null,
      lastLoginAt: now,
    })
    .onConflictDoUpdate({
      target: users.firebaseUid,
      set: { lastLoginAt: now, updatedAt: now },
    })
    .returning();
  return toAppUser(created!);
}

function toAppUser(row: typeof users.$inferSelect): AppUser {
  return {
    id: row.id,
    firebaseUid: row.firebaseUid,
    email: row.email,
    emailVerified: row.emailVerified,
    displayName: row.displayName,
    photoUrl: row.photoUrl,
    phone: row.phone,
    disabled: row.disabled,
  };
}

/* -------------------------------------------------------------------------- */
/* ID token verification entry point                                           */
/* -------------------------------------------------------------------------- */

export async function identityFromIdToken(idToken: string): Promise<IdentityRecord> {
  let verified: {
    uid: string;
    email: string;
    emailVerified: boolean;
    name: string | null;
    photo: string | null;
    phone: string | null;
  };

  if (firebaseAdminConfigured()) {
    // Preferred path: Admin SDK, which also performs revocation checking.
    verified = await verifyIdToken(idToken);
  } else {
    // Fallback: verify against Google's published Secure Token public keys.
    // Requires no server credential, only the (public) project ID.
    verified = await verifyIdTokenWithPublicKeys(idToken);
  }

  return {
    uid: verified.uid,
    email: verified.email,
    emailVerified: verified.emailVerified,
    name: verified.name,
    photo: verified.photo,
    phone: verified.phone,
  };
}

/** Test-mode helper: refuses to run in production, ever. */
export function assertTestModeAllowed(): void {
  const env = serverEnv();
  if (env.NODE_ENV === "production") {
    throw new AuthError("forbidden", "Test sign-in mode is disabled in production.");
  }
  if (env.AUTH_TEST_MODE !== "true") {
    throw new AuthError(
      "forbidden",
      "AUTH_TEST_MODE is not enabled. Set AUTH_TEST_MODE=true in .env.local to use local sign-in.",
    );
  }
}

/** Non-throwing counterpart of `assertTestModeAllowed`, for capability probes. */
export function isTestModeAvailable(): boolean {
  const env = serverEnv();
  return env.NODE_ENV !== "production" && env.AUTH_TEST_MODE === "true";
}

/** Used by server actions that must operate on exactly one owner's data. */
export async function assertOwnsResource(userId: string, resourceUserId: string): Promise<void> {
  if (userId !== resourceUserId) {
    throw new AuthError("forbidden", "You do not have access to this resource.");
  }
}

export async function hasPurchased(userId: string, productId: string): Promise<boolean> {
  const rows = await db
    .select({ id: orders.id })
    .from(orders)
    .innerJoin(orderItems, eq(orderItems.orderId, orders.id))
    .where(and(eq(orders.userId, userId), eq(orderItems.productId, productId)))
    .limit(1);
  return rows.length > 0;
}
