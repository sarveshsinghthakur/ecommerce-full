import "server-only";

import { gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { rateLimitHits } from "@/db/schema";

/**
 * Database-backed fixed-window rate limiter.
 *
 * A row per (bucket, subject, window) keeps the logic trivially auditable and
 * survives serverless cold starts / multi-instance deployments, which an
 * in-memory counter cannot. Uses `INSERT ... ON CONFLICT DO UPDATE` with a
 * guarded increment so concurrent requests cannot exceed the limit through a
 * read-then-write race.
 */

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
}

export interface RateLimitOptions {
  /** Logical bucket name, e.g. "search", "chat", "import". */
  bucket: string;
  /** Identifier for the caller: user id, IP, or a stable hash of both. */
  subject: string;
  limit: number;
  windowSeconds?: number;
}

const WINDOW_FALLBACK_SECONDS = 60;

function windowStart(now: Date, windowSeconds: number): Date {
  const ms = windowSeconds * 1000;
  return new Date(Math.floor(now.getTime() / ms) * ms);
}

export async function consumeRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  const windowSeconds = opts.windowSeconds ?? WINDOW_FALLBACK_SECONDS;
  const now = new Date();
  const start = windowStart(now, windowSeconds);
  const expiresAt = new Date(start.getTime() + windowSeconds * 1000);

  const rows = await db
    .insert(rateLimitHits)
    .values({
      bucket: opts.bucket,
      subject: opts.subject,
      windowStart: start,
      hits: 1,
      expiresAt,
    })
    .onConflictDoUpdate({
      target: [rateLimitHits.bucket, rateLimitHits.subject, rateLimitHits.windowStart],
      set: {
        hits: sql`${rateLimitHits.hits} + 1`,
        expiresAt,
      },
      where: gt(rateLimitHits.expiresAt, now),
    })
    .returning({ hits: rateLimitHits.hits });

  const hits = rows[0]?.hits ?? 1;
  return {
    allowed: hits <= opts.limit,
    remaining: Math.max(0, opts.limit - hits),
    limit: opts.limit,
    resetAt: expiresAt.getTime(),
  };
}

/** Best-effort janitor; safe to call opportunistically from a cron route. */
export async function purgeExpiredRateLimits(): Promise<number> {
  const res = await db
    .delete(rateLimitHits)
    .where(gt(rateLimitHits.expiresAt, new Date()));
  return res.rowCount ?? 0;
}

/**
 * Stable subject for anonymous callers. Uses the forwarded client IP when
 * present, otherwise a coarse fallback so a missing header cannot disable
 * rate limiting.
 */
export function clientSubject(headers: Headers, userId?: string | null): string {
  if (userId) return `u:${userId}`;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return `ip:${first}`;
  }
  const real = headers.get("x-real-ip");
  if (real) return `ip:${real.trim()}`;
  return "ip:unknown";
}

/**
 * Rate limit guard that never throws. On a storage failure it reports
 * `allowed: true` so a limiter outage cannot take an endpoint down — the DB
 * unique constraint remains the hard backstop when storage is healthy.
 */
export async function enforceRateLimit(opts: RateLimitOptions): Promise<RateLimitResult> {
  try {
    return await consumeRateLimit(opts);
  } catch {
    return { allowed: true, remaining: opts.limit, limit: opts.limit, resetAt: 0 };
  }
}
