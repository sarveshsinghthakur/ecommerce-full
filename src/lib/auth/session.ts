/**
 * Signed session cookie primitives.
 *
 * Deliberately independent of any third-party SDK: the cookie carries only the
 * verified identity we minted server-side, and every privileged decision is
 * re-derived from environment configuration at request time.
 *
 * Uses Web Crypto so the same code path runs in the Edge middleware and in
 * Node route handlers. Signature verification is constant-time.
 */

export const SESSION_COOKIE = "aurora_session";
export const SESSION_VERSION = 1;
/** 7 days. Re-issued on every successful `/api/auth/session` call. */
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  /** Firebase UID (or the test-mode shim UID). */
  uid: string;
  email: string;
  name: string | null;
  photo: string | null;
  /** Epoch seconds. */
  iat: number;
  exp: number;
  v: number;
}

const encoder = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (const b of view) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function b64urlToString(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return atob(padded + pad);
}

async function importKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

export function createSessionPayload(
  identity: { uid: string; email: string; name?: string | null; photo?: string | null },
  nowSeconds = Math.floor(Date.now() / 1000),
): SessionPayload {
  return {
    uid: identity.uid,
    email: identity.email.toLowerCase(),
    name: identity.name ?? null,
    photo: identity.photo ?? null,
    iat: nowSeconds,
    exp: nowSeconds + SESSION_TTL_SECONDS,
    v: SESSION_VERSION,
  };
}

export async function signSession(payload: SessionPayload, secret: string): Promise<string> {
  if (!secret) throw new Error("APP_SECRET is not configured");
  const body = b64url(encoder.encode(JSON.stringify(payload)));
  const key = await importKey(secret);
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${b64url(sig)}`;
}

/**
 * Verifies structure, signature and expiry.
 * Returns `null` for every failure mode — callers must treat null as "signed out".
 */
export async function verifySession(
  token: string | undefined | null,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<SessionPayload | null> {
  if (!token || !secret) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, sig] = parts as [string, string];
  if (!body || !sig) return null;

  try {
    const key = await importKey(secret);
    const sigBytes = Uint8Array.from(atob(sig.replace(/-/g, "+").replace(/_/g, "/")), (c) =>
      c.charCodeAt(0),
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes,
      encoder.encode(body),
    );
    if (!valid) return null;

    const payload = JSON.parse(b64urlToString(body)) as SessionPayload;
    if (
      !payload ||
      typeof payload.uid !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }
    if (payload.v !== SESSION_VERSION) return null;
    if (payload.exp <= nowSeconds) return null;
    return { ...payload, email: payload.email.toLowerCase() };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAgeSeconds = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

/** Reads a single cookie out of a raw `Cookie` header. */
export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    if (part.slice(0, index).trim() !== name) continue;
    const value = part.slice(index + 1).trim();
    if (!value) return null;
    try {
      return decodeURIComponent(value);
    } catch {
      return value;
    }
  }
  return null;
}
