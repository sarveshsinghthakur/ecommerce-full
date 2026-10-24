import { describe, expect, it } from "vitest";
import {
  SESSION_TTL_SECONDS,
  createSessionPayload,
  signSession,
  verifySession,
} from "./session";

const SECRET = "test-secret-that-is-long-enough-for-hmac";
const NOW = 1_760_000_000;

function basePayload() {
  return createSessionPayload(
    { uid: "abc123", email: "Owner@Example.com", name: "Owner" },
    NOW,
  );
}

describe("session signing", () => {
  it("round-trips a payload", async () => {
    const token = await signSession(basePayload(), SECRET);
    const verified = await verifySession(token, SECRET, NOW + 10);
    expect(verified).not.toBeNull();
    expect(verified?.uid).toBe("abc123");
    expect(verified?.email).toBe("owner@example.com");
    expect(verified?.name).toBe("Owner");
    expect(verified?.v).toBe(1);
  });

  it("expires at the documented time-to-live", async () => {
    const payload = basePayload();
    expect(payload.exp - payload.iat).toBe(SESSION_TTL_SECONDS);
    const token = await signSession(payload, SECRET);
    expect(await verifySession(token, SECRET, payload.exp - 1)).not.toBeNull();
    expect(await verifySession(token, SECRET, payload.exp)).toBeNull();
  });

  it("rejects a payload tampered with after signing", async () => {
    const token = await signSession(basePayload(), SECRET);
    const [body, sig] = token.split(".") as [string, string];
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    decoded.uid = "attacker-uid";
    const forged = `${Buffer.from(JSON.stringify(decoded)).toString("base64url")}.${sig}`;
    expect(await verifySession(forged, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(basePayload(), "another-secret-value-here");
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it("rejects malformed tokens without throwing", async () => {
    for (const bad of [undefined, null, "", "no-dot", "a.b.c", "…", ".."]) {
      expect(await verifySession(bad as string, SECRET, NOW)).toBeNull();
    }
  });

  it("refuses to verify without an application secret", async () => {
    const token = await signSession(basePayload(), SECRET);
    expect(await verifySession(token, "", NOW)).toBeNull();
  });

  it("requires the current session version", async () => {
    const token = await signSession({ ...basePayload(), v: 999 }, SECRET);
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });

  it("rejects a token whose payload is not an object", async () => {
    const body = Buffer.from("null").toString("base64url");
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
    const token = `${body}.${Buffer.from(new Uint8Array(sig)).toString("base64url")}`;
    expect(await verifySession(token, SECRET, NOW)).toBeNull();
  });
});
