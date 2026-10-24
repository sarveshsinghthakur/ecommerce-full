import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function main() {
  const s = await pool.query(
    `select table_schema, table_name from information_schema.tables
     where table_name like '%migration%'`,
  );
  console.log("migration tables:", JSON.stringify(s.rows));

  const m = await pool.query(
    "select id, hash from drizzle.__drizzle_migrations order by created_at desc limit 2",
  );
  console.log("applied migrations:", JSON.stringify(m.rows));

  const i = await pool.query(
    `insert into products (id, slug, title, source_price, markup_percent, calculated_selling_price, selling_price)
     values ('probe-1','probe-product','Probe Product Wool Blend','100.00','9.00','109.00','109.00')
     returning id, search_vector::text as sv`,
  );
  console.log("search_vector:", i.rows[0]?.sv);

  const q = await pool.query(
    `select id from products where search_vector @@ plainto_tsquery('english','wool blend')`,
  );
  console.log("fts matches:", q.rows.length);

  const f = await pool.query(
    `select id from products where (title || ' ' || coalesce(brand,'')) % 'woolblnd'`,
  );
  console.log("trigram matches:", f.rows.length);

  await pool.query("delete from products where id = 'probe-1'");
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
