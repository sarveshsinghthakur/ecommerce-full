import "server-only";

import { createPublicKey, createVerify, X509Certificate } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Service-account-free verification of Firebase ID tokens.
 *
 * Firebase Admin normally verifies these tokens, but it requires a service
 * account credential. ID tokens are, however, publicly verifiable: they are
 * RS256-signed by Google's Secure Token service and the signing keys are
 * published at a well-known certs endpoint. This module downloads those
 * public keys and enforces the checks documented by Firebase
 * (https://firebase.google.com/docs/auth/admin/verify-id-tokens):
 *
 *   - header alg is RS256 and `kid` matches a published cert
 *   - signature verifies against the cert's public key
 *   - iss === https://securetoken.google.com/<projectId>
 *   - aud === <projectId>
 *   - sub (the Firebase UID) is present
 *   - exp / iat / auth_time are within a small clock-skew window
 *
 * Note: without the Admin SDK there is no `checkRevoked` step, so tokens are
 * accepted until expiry even after a force-logout on the device.
 */

export interface VerifiedTokenClaims {
  uid: string;
  email: string;
  emailVerified: boolean;
  name: string | null;
  photo: string | null;
  phone: string | null;
  provider: string | null;
}

const CERTS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";

/** Google docs recommend allowing some leeway on token timestamps. */
const CLOCK_SKEW_SECONDS = 5 * 60;

let cachedPems: { keys: Record<string, string>; expiresAt: number } | null = null;

async function fetchPublicKeys(): Promise<Record<string, string>> {
  const now = Date.now();
  if (cachedPems && cachedPems.expiresAt > now) return cachedPems.keys;

  const res = await fetch(CERTS_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Could not download Google public keys (HTTP ${res.status}).`);
  }
  const cacheControl = res.headers.get("cache-control") ?? "";
  const maxAge = Number(/max-age=(\d+)/i.exec(cacheControl)?.[1] ?? 3600);
  const keys = (await res.json()) as Record<string, string>;
  if (!keys || typeof keys !== "object" || Object.keys(keys).length === 0) {
    throw new Error("Google public-key endpoint returned an empty key set.");
  }
  cachedPems = { keys, expiresAt: now + maxAge * 1000 };
  return keys;
}

/** Test hook: pre-seed the cert cache so unit tests never hit the network. */
export function setCachedPublicKeysForTests(keys: Record<string, string>): void {
  cachedPems = { keys, expiresAt: Date.now() + 60 * 60 * 1000 };
}

export function resetCachedPublicKeys(): void {
  cachedPems = null;
}

function decodeSegment<T>(segment: string, label: string): T {
  const json = Buffer.from(segment, "base64url").toString("utf8");
  try {
    return JSON.parse(json) as T;
  } catch {
    throw new Error(`Invalid Firebase ID token (${label} segment is not valid JSON).`);
  }
}

/** Accepts the X.509 certs Google publishes, or a bare public-key PEM. */
function publicKeyFromPem(pem: string): ReturnType<typeof createPublicKey> {
  if (pem.includes("BEGIN CERTIFICATE")) {
    return new X509Certificate(pem).publicKey;
  }
  return createPublicKey(pem);
}

interface TokenHeader {
  alg?: string;
  kid?: string;
}
interface TokenClaims {
  iss?: string;
  aud?: string;
  sub?: string;
  user_id?: string;
  exp?: number;
  iat?: number;
  auth_time?: number;
  email?: string;
  email_verified?: boolean | "true" | "false";
  name?: string;
  picture?: string;
  phone_number?: string;
  firebase?: { sign_in_provider?: string };
}

export async function verifyIdTokenWithPublicKeys(
  idToken: string,
): Promise<VerifiedTokenClaims> {
  const projectId = serverEnv().NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error(
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID is empty, so Firebase tokens cannot be verified server-side.",
    );
  }

  const [headSegment, payloadSegment, signatureSegment] = idToken.trim().split(".");
  if (!headSegment || !payloadSegment || !signatureSegment) {
    throw new Error("Invalid Firebase ID token (wrong structure).");
  }
  const header = decodeSegment<TokenHeader>(headSegment, "header");
  const claims = decodeSegment<TokenClaims>(payloadSegment, "payload");

  if (header.alg !== "RS256") {
    throw new Error("Firebase token uses an unexpected signing algorithm.");
  }
  if (!header.kid) {
    throw new Error("Firebase token is missing the key id (kid) header.");
  }
  if (!claims.sub || typeof claims.sub !== "string") {
    throw new Error("Firebase token has no subject (Firebase UID).");
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== "number" || claims.exp <= nowSeconds - CLOCK_SKEW_SECONDS) {
    throw new Error("Your session token has expired. Refresh and try again.");
  }
  if (typeof claims.iat === "number" && claims.iat > nowSeconds + CLOCK_SKEW_SECONDS) {
    throw new Error("Firebase token issued in the future; check the server clock.");
  }
  if (
    typeof claims.auth_time === "number" &&
    claims.auth_time > nowSeconds + CLOCK_SKEW_SECONDS
  ) {
    throw new Error("Firebase token auth_time is in the future; check the server clock.");
  }
  if (claims.iss !== `https://securetoken.google.com/${projectId}`) {
    throw new Error("Firebase token was issued for a different project.");
  }
  if (claims.aud !== projectId) {
    throw new Error("Firebase token audience does not match this project.");
  }

  const keys = await fetchPublicKeys();
  const pem = keys[header.kid];
  if (!pem) {
    throw new Error("Firebase token was signed with an unknown key. Try signing in again.");
  }
  const publicKey = publicKeyFromPem(pem);
  const signatureOk = createVerify("RSA-SHA256")
    .update(`${headSegment}.${payloadSegment}`)
    .verify(publicKey, Buffer.from(signatureSegment, "base64url"));
  if (!signatureOk) {
    throw new Error("Firebase token signature is invalid.");
  }

  return {
    uid: claims.sub,
    email: (claims.email ?? "").toLowerCase(),
    emailVerified: claims.email_verified === true || claims.email_verified === "true",
    name: typeof claims.name === "string" ? claims.name : null,
    photo: typeof claims.picture === "string" ? claims.picture : null,
    phone: typeof claims.phone_number === "string" ? claims.phone_number : null,
    provider: claims.firebase?.sign_in_provider ?? null,
  };
}
