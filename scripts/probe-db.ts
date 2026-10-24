import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing");
  process.exit(1);
}

const pool = new Pool({ connectionString: url, max: 1 });

async function main() {
  const r = await pool.query(
    "select current_database() db, current_user usr, version() v",
  );
  console.log("CONNECTED:", JSON.stringify(r.rows[0], null, 2));

  const ext = await pool.query(
    "select name from pg_available_extensions where name in ('pgcrypto','pg_trgm','uuid-ossp') order by name",
  );
  console.log("available extensions:", ext.rows.map((x) => x.name).join(", "));

  const tables = await pool.query(
    "select count(*)::int n from information_schema.tables where table_schema='public'",
  );
  console.log("existing public tables:", tables.rows[0].n);

  await pool.query("begin");
  await pool.query("create temp table _t_probe(id text primary key)");
  await pool.query("insert into _t_probe values ('a')");
  await pool.query("rollback");
  console.log("transaction support: OK");
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
