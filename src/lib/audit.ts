import "server-only";

import { and, desc, eq } from "drizzle-orm";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { auditLogs } from "@/db/schema";
import { newId } from "@/lib/ids";

/**
 * Any Drizzle Postgres handle — the connection itself or an open transaction —
 * so callers can write an audit row atomically with the action it records.
 */
type Db = PgDatabase<PgQueryResultHKT, Record<string, unknown>>;

/**
 * Admin activity actions. Kept as a closed union so a typo cannot silently
 * create an un-queryable action name.
 */
export type AuditAction =
  | "auth.login"
  | "auth.logout"
  | "auth.test_login"
  | "product.create"
  | "product.update"
  | "product.publish"
  | "product.unpublish"
  | "product.delete"
  | "product.reprice"
  | "import.create"
  | "import.review"
  | "import.approve"
  | "import.reject"
  | "order.create"
  | "order.status_change"
  | "order.refund"
  | "settings.update"
  | "coupon.create"
  | "coupon.update"
  | "admin.grant"
  | "admin.revoke";

export interface AuditEntry {
  action: AuditAction;
  /** Firebase UID of the acting administrator, when known. */
  actorUid?: string | null;
  actorEmail?: string | null;
  targetType: string;
  targetId?: string | null;
  /** Human-readable one-liner shown in the activity feed. */
  summary: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Writes an immutable admin-activity record.
 *
 * Never throws: a failed audit write must not roll back the action it
 * describes. Returns `false` so the caller can log the gap.
 */
export async function writeAudit(entry: AuditEntry, executor: Db): Promise<boolean> {
  try {
    const metadata: Record<string, unknown> = { summary: entry.summary };
    if (entry.before !== undefined) metadata.before = entry.before;
    if (entry.after !== undefined) metadata.after = entry.after;
    if (entry.userAgent) metadata.userAgent = entry.userAgent;

    await executor.insert(auditLogs).values({
      id: newId("aud"),
      actorUid: entry.actorUid ?? null,
      actorEmail: entry.actorEmail ?? null,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId ?? null,
      metadata,
      ip: entry.ip ?? null,
    });
    return true;
  } catch {
    return false;
  }
}

/** Recent activity for one entity, newest first. */
export async function listAuditForEntity(
  executor: Db,
  targetType: string,
  targetId: string,
  limit = 25,
) {
  return executor
    .select()
    .from(auditLogs)
    .where(and(eq(auditLogs.targetType, targetType), eq(auditLogs.targetId, targetId)))
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

/** Store-wide activity feed for the admin dashboard. */
export async function listRecentAudit(executor: Db, limit = 50) {
  return executor
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(limit);
}

export interface ParsedAuditMetadata {
  summary?: string;
  before?: unknown;
  after?: unknown;
  userAgent?: string;
}

export function parseAuditMetadata(raw: unknown): ParsedAuditMetadata {
  if (raw && typeof raw === "object") return raw as ParsedAuditMetadata;
  return {};
}

/** Best-effort client IP for audit records. */
export function ipFromHeaders(headers: Headers): string | null {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    null
  );
}
