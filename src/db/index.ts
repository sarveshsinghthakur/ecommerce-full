import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool, type PoolClient } from "pg";
import * as schema from "./schema";

export type Database = NodePgDatabase<typeof schema>;
export type Tx = Parameters<Parameters<Database["transaction"]>[0]>[0];

const globalForDb = globalThis as unknown as {
  __pgPool?: Pool;
  __db?: Database;
};

function createPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. Copy .env.example to .env.local and set your Neon connection string.",
    );
  }
  return new Pool({
    connectionString: url,
    max: Number(process.env.PG_POOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    application_name: "aurora-store",
    // TLS is configured by `sslmode` in the connection string. pg >= 8.6 parses
    // it and verifies the server certificate; do not override that here.
  });
}

function getPool(): Pool {
  if (!globalForDb.__pgPool) globalForDb.__pgPool = createPool();
  return globalForDb.__pgPool;
}

export function getDb(): Database {
  if (!globalForDb.__db) globalForDb.__db = drizzle(getPool(), { schema });
  return globalForDb.__db;
}

/** Convenience singleton — safe across HMR because the pool is cached on globalThis. */
export const db = getDb();

/**
 * Runs `fn` inside a single transaction with a dedicated client.
 * Any throw rolls the whole unit of work back.
 */
export async function withTransaction<T>(
  fn: (tx: Tx, client: PoolClient) => Promise<T>,
): Promise<T> {
  const pool = getPool();
  const client = await pool.connect();
  try {
    const tx = drizzle(client, { schema });
    return await fn(tx as unknown as Tx, client);
  } finally {
    client.release();
  }
}

/** Closes the shared pool. Used by scripts and tests only. */
export async function closeDb(): Promise<void> {
  if (globalForDb.__pgPool) {
    await globalForDb.__pgPool.end();
    globalForDb.__pgPool = undefined;
    globalForDb.__db = undefined;
  }
}
