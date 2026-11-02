/**
 * Programmatic migration runner.
 *
 * `drizzle-kit migrate` swallows the underlying driver error on this setup, so
 * we use drizzle's own node-postgres migrator instead. Same journal, same
 * `drizzle_migrations` bookkeeping table, but failures are surfaced verbatim.
 */
import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) {
    throw new Error("DATABASE_URL is not set. Copy .env.example -> .env.local");
  }
  const url = rawUrl.replace(
    /([?&]sslmode=)(?:prefer|require|verify-ca)(?=&|$)/gi,
    "$1verify-full",
  );

  const pool = new Pool({ connectionString: url, max: 1 });
  const db = drizzle(pool);

  console.log("Applying migrations from ./src/db/migrations ...");
  await migrate(db, { migrationsFolder: "./src/db/migrations" });
  console.log("Migrations applied.");

  const res = await pool.query(
    `select count(*)::int as n from information_schema.tables
     where table_schema = 'public' and table_name not like '\\_%'`,
  );
  console.log(`public tables now: ${res.rows[0].n}`);

  await pool.end();
}

main().catch((err) => {
  console.error("\nMIGRATION FAILED:");
  console.error(err);
  process.exit(1);
});
