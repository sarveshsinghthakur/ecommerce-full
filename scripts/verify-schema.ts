import { config } from "dotenv";

config({ path: ".env.local" });
config({ path: ".env" });

import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

async function main() {
  const t = await pool.query(
    `select table_name from information_schema.tables
     where table_schema='public' and table_name not like '\\_%'
     order by 1`,
  );
  const wanted = t.rows.map((r) => r.table_name);
  console.log("tables:", wanted.length);
  console.log(wanted.join(", "));

  const cols = await pool.query(
    `select table_name, count(*)::int n from information_schema.columns
     where table_schema='public' group by 1 order by 1`,
  );
  console.log(
    "columns:",
    cols.rows.map((r) => `${r.table_name}=${r.n}`).join(", "),
  );
  const missing = [
    "users",
    "user_addresses",
    "admin_roles",
    "categories",
    "products",
    "product_images",
    "product_variants",
    "product_attributes",
    "source_listings",
    "product_price_history",
    "product_import_jobs",
    "carts",
    "cart_items",
    "wishlists",
    "wishlist_items",
    "orders",
    "order_items",
    "payments",
    "order_status_history",
    "customer_reviews",
    "coupons",
    "contact_messages",
    "chat_sessions",
    "chat_messages",
    "store_settings",
    "audit_logs",
  ].filter((x) => !wanted.includes(x));
  console.log("MISSING REQUIRED:", missing.length ? missing.join(", ") : "none");

  const idx = await pool.query(
    `select indexname from pg_indexes where schemaname='public' and tablename='products' order by 1`,
  );
  console.log("product indexes:", idx.rows.map((r) => r.indexname).join(", "));

  const ext = await pool.query(
    `select extname from pg_extension where extname in ('pg_trgm','pgcrypto') order by 1`,
  );
  console.log("extensions:", ext.rows.map((r) => r.extname).join(", "));

  const mig = await pool.query(
    `select * from drizzle_migrations order by created_at desc limit 3`,
  );
  console.log("migrations:", JSON.stringify(mig.rows));

  const probe = await pool.query(
    `insert into products (id, slug, title, source_price, markup_percent, calculated_selling_price, selling_price)
     values ('probe-1','probe-1','Probe Product', '100.00', '9.00', '109.00', '109.00')
     returning id, search_vector::text as sv`,
  );
  console.log("search_vector sample:", probe.rows[0]?.sv);
  await pool.query(`delete from products where id = 'probe-1'`);
}

main()
  .catch((e) => {
    console.error("FAILED:", e.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
