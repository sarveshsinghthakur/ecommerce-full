import { describe, it, expect, beforeEach } from "vitest";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";

import {
  setCachedPublicKeysForTests,
  resetCachedPublicKeys,
  verifyIdTokenWithPublicKeys,
} from "./id-token";

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();

const PROJECT_ID = "composio-6aee9";

// The verifier reads the project ID via serverEnv(); seed it before use.
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??= PROJECT_ID;

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function signToken(claims: Record<string, unknown>, opts: { kid?: string; alg?: string } = {}) {
  const header = { alg: opts.alg ?? "RS256", kid: opts.kid ?? "test-key", typ: "JWT" };
  const input = `${encodeJson(header)}.${encodeJson(claims)}`;
  const signature = cryptoSign("RSA-SHA256", Buffer.from(input), privateKey);
  return `${input}.${signature.toString("base64url")}`;
}

function makeClaims(overrides: Record<string, unknown> = {}) {
  const now = Math.floor(Date.now() / 1000);
  return {
    iss: `https://securetoken.google.com/${PROJECT_ID}`,
    aud: PROJECT_ID,
    auth_time: now - 60,
    sub: "firebase-uid-123",
    iat: now - 60,
    exp: now + 3600,
    email: "Owner@Example.com",
    email_verified: true,
    name: "Test Owner",
    picture: "https://example.com/avatar.png",
    ...overrides,
  };
}

beforeEach(() => {
  resetCachedPublicKeys();
  setCachedPublicKeysForTests({ "test-key": publicKeyPem });
});

describe("verifyIdTokenWithPublicKeys", () => {
  it("accepts a correctly signed token and maps the identity claims", async () => {
    const claims = await verifyIdTokenWithPublicKeys(signToken(makeClaims()));
    expect(claims.uid).toBe("firebase-uid-123");
    expect(claims.email).toBe("owner@example.com");
    expect(claims.emailVerified).toBe(true);
    expect(claims.name).toBe("Test Owner");
    expect(claims.photo).toBe("https://example.com/avatar.png");
  });

  it("rejects a token whose kid is not in the published key set", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims(), { kid: "unknown-key" })),
    ).rejects.toThrow(/unknown key/i);
  });

  it("rejects an invalid signature", async () => {
    const token = signToken(makeClaims());
    const last = token.slice(0, -4);
    await expect(verifyIdTokenWithPublicKeys(`${last}BEEF`)).rejects.toThrow(/signature/i);
  });

  it("rejects a token minted for a different project (aud mismatch)", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims({ aud: "other-project" }))),
    ).rejects.toThrow(/audience/i);
  });

  it("rejects a token with a foreign issuer", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims({ iss: "https://securetoken.google.com/other" }))),
    ).rejects.toThrow(/different project/i);
  });

  it("rejects an expired token", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims({ exp: Math.floor(Date.now() / 1000) - 1000 }))),
    ).rejects.toThrow(/expired/i);
  });

  it("rejects a token with no subject", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims({ sub: undefined }))),
    ).rejects.toThrow(/subject/i);
  });

  it("rejects non-RS256 tokens", async () => {
    await expect(
      verifyIdTokenWithPublicKeys(signToken(makeClaims(), { alg: "none" })),
    ).rejects.toThrow(/unexpected signing algorithm/i);
  });

  it("rejects malformed tokens", async () => {
    await expect(verifyIdTokenWithPublicKeys("garbage")).rejects.toThrow(/malformed|wrong structure/i);
  });
});
