import { randomBytes, randomUUID } from "node:crypto";

const ALPHABET = "0123456789abcdefghjkmnpqrstvwxyz"; // Crockford-ish, no i/l/o/u

/**
 * Sortable, collision-resistant public identifier.
 *
 * Format: `<prefix>_<base36 millis><random>` e.g. `prd_01jd3k8m4z_q7f2`.
 * The time prefix keeps ids roughly ordered, which makes index-ordered scans
 * and pagination stable without exposing sequential counts.
 */
export function newId(prefix: string): string {
  const time = Date.now().toString(36).padStart(9, "0");
  const bytes = randomBytes(8);
  let rand = "";
  for (const b of bytes) rand += ALPHABET[b % ALPHABET.length];
  return `${prefix}_${time}${rand}`;
}

export function newUuid(): string {
  return randomUUID();
}

/** URL-safe opaque token (for cart session ids, guest chat tokens, CSRF). */
export function newToken(bytes = 24): string {
  return randomBytes(bytes).toString("base64url");
}
