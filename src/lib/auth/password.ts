import "server-only";

import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "crypto";
import { promisify } from "util";

/**
 * Password hashing for the local-development sign-in shim (AUTH_TEST_MODE).
 *
 * Real deployments authenticate through Firebase, which owns the credential;
 * this module only exists so the dev shim can require and verify a password
 * instead of signing in on an email address alone. The format is self
 * describing (`scrypt:<salt>:<hash>`) so the algorithm can be rotated later
 * without a flag day.
 */

const scrypt = promisify(scryptCb) as (
  password: string,
  salt: string,
  keylen: number,
) => Promise<Buffer>;

const KEY_LENGTH = 64;
const SCHEME = "scrypt";

export const MIN_PASSWORD_LENGTH = 8;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH);
  return `${SCHEME}:${salt}:${derived.toString("hex")}`;
}

/**
 * Constant-time verification. Returns false for malformed or unknown-scheme
 * stored values rather than throwing, so a corrupt row can never 500 a
 * sign-in attempt into an information leak.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;
  const [scheme, salt, hex] = stored.split(":");
  if (scheme !== SCHEME || !salt || !hex) return false;

  const expected = Buffer.from(hex, "hex");
  if (expected.length !== KEY_LENGTH) return false;

  const derived = await scrypt(password, salt, KEY_LENGTH);
  return timingSafeEqual(derived, expected);
}
