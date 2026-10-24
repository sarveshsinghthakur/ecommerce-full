import { z } from "zod";

/**
 * Environment access.
 *
 * Two flavours:
 *  - `publicEnv`   : only NEXT_PUBLIC_* values, safe to inline in client code.
 *  - `serverEnv`   : everything, must only ever be imported from server code.
 *
 * Values are validated once, lazily, so a missing required variable produces a
 * single readable failure instead of an `undefined is not a function` deep in a
 * request handler.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Aurora"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional().default(""),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional().default(""),
  NEXT_PUBLIC_RAZORPAY_KEY_ID: z.string().optional().default(""),
});

const serverSchema = publicSchema.extend({
  DATABASE_URL: z.string().min(1).optional().default(""),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional().default(""),
  FIREBASE_PROJECT_ID: z.string().optional().default(""),
  FIREBASE_CLIENT_EMAIL: z.string().optional().default(""),
  FIREBASE_PRIVATE_KEY: z.string().optional().default(""),

  ADMIN_EMAILS: z.string().optional().default(""),
  ADMIN_UIDS: z.string().optional().default(""),
  /** Enables a non-production sign-in shim. Hard-disabled in production. */
  AUTH_TEST_MODE: z.string().optional().default(""),

  MISTRAL_API_KEY: z.string().optional().default(""),
  MISTRAL_MODEL: z.string().optional().default("mistral-small-latest"),

  RAZORPAY_KEY_ID: z.string().optional().default(""),
  RAZORPAY_KEY_SECRET: z.string().optional().default(""),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional().default(""),

  DEFAULT_MARKUP_PERCENT: z.coerce.number().min(0).max(100).default(9),
  DEFAULT_CURRENCY: z.string().length(3).default("INR"),

  APP_SECRET: z.string().optional().default(""),
  RATE_LIMIT_SEARCH: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_CHAT: z.coerce.number().int().positive().default(12),
  RATE_LIMIT_IMPORT: z.coerce.number().int().positive().default(6),
  RATE_LIMIT_CONTACT: z.coerce.number().int().positive().default(5),
  RATE_LIMIT_ORDER: z.coerce.number().int().positive().default(10),

  IMPORT_OFFLINE: z.string().optional().default(""),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServer: ServerEnv | null = null;

export function serverEnv(): ServerEnv {
  if (cachedServer) return cachedServer;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cachedServer = parsed.data;
  return cachedServer;
}

export function publicEnv(): PublicEnv {
  const parsed = publicSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Invalid public environment: ${parsed.error.issues
        .map((i) => i.path.join("."))
        .join(", ")}`,
    );
  }
  return parsed.data;
}

/** Parses a comma separated list into a trimmed, de-duplicated, non-empty set. */
export function parseList(value: string | undefined): string[] {
  if (!value) return [];
  return [
    ...new Set(
      value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
}

/** True when the process is running a production build. */
export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}
