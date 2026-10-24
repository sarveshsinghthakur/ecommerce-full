import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "pg";

/** Uses the UNPOOLED url because CREATE DATABASE cannot run via pgbouncer. */
const url = process.env.DATABASE_URL_UNPOOLED;
const pool = new Pool({ connectionString: url, max: 1 });

async function main() {
  const existing = await pool.query(
    `select datname from pg_database where datname = $1`,
    ["ecommerce"],
  );
  if (existing.rowCount) {
    console.log("database 'ecommerce' already exists");
    return;
  }
  await pool.query(`CREATE DATABASE ecommerce`);
  console.log("created database 'ecommerce'");
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
