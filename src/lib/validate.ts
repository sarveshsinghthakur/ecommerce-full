import { z } from "zod";

/**
 * Shared validation helpers for Server Actions and Route Handlers.
 *
 * Every mutating endpoint parses its input here. Returning a discriminated
 * result (rather than throwing) keeps the error mapping in one place and
 * stops raw Zod messages — which can leak internal shape — reaching the
 * client.
 */

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

export function fail(
  error: string,
  fieldErrors?: Record<string, string[]>,
): ActionResult<never> {
  return fieldErrors ? { ok: false, error, fieldErrors } : { ok: false, error };
}

export function ok<T>(data: T): ActionResult<T> {
  return { ok: true, data };
}

/** Normalises a Zod error into a flat, client-safe field map. */
export function toFieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}

/** Parses JSON from a Request, guarding against empty/malformed bodies. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

export async function parseRequest<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<ActionResult<z.infer<T>>> {
  const body = await readJson(request);
  if (body === null) return fail("Request body must be valid JSON.");
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return fail("Please correct the highlighted fields.", toFieldErrors(parsed.error));
  }
  return ok(parsed.data);
}

/* ------------------------------ field schemas ----------------------------- */

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Email is required.")
  .max(254, "Email is too long.")
  .email("Enter a valid email address.");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters.")
  .max(128, "Password is too long.");

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Name is required.")
  .max(120, "Name is too long.");

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9][0-9\s-]{6,18}$/, "Enter a valid phone number.")
  .optional()
  .or(z.literal(""));

export const moneyStringSchema = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, "Enter a valid amount.");

/** Accepts `string` or `File` uploads through FormData-backed server actions. */
export function requiredString(max: number, label: string) {
  return z
    .string({ error: `${label} is required.` })
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be at most ${max} characters.`);
}

export function optionalString(max: number) {
  return z
    .string()
    .trim()
    .max(max)
    .optional()
    .or(z.literal(""));
}

/** Query-string integer with bounds, for pagination and limit arguments. */
export function boundedInt(min: number, max: number, fallback: number) {
  return z.coerce.number().int().min(min).max(max).default(fallback);
}

export const paginationSchema = z.object({
  page: boundedInt(1, 10_000, 1),
  pageSize: boundedInt(1, 100, 20),
});

export type Pagination = z.infer<typeof paginationSchema>;
