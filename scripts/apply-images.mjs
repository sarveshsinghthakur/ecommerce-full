/**
 * Points every published product's images at the locally sourced photograph.
 *
 * The seed data wrote `picsum.photos` random URLs (a backpack showed a beach).
 * This rewrites `product_images` to the curated file in
 * `public/images/products/<slug>.jpg`, but **only** where that file actually
 * exists — a product with no sourced image keeps its old row rather than
 * ending up pointing at a 404.
 *
 *   node scripts/apply-images.mjs           # preview
 *   node scripts/apply-images.mjs --write   # apply
 */

import { readdir } from "node:fs/promises";
import { Client } from "pg";

const DIR = "public/images/products";
const CAT_DIR = "public/images/categories";
const write = process.argv.includes("--write");
const doCategories = process.argv.includes("--categories");

const env = await import("node:fs").then((fs) =>
  fs.readFileSync(".env.local", "utf8"),
);
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const files = new Set(await readdir(DIR));
const c = new Client({ connectionString: url });
await c.connect();

const rows = await c.query(`
  select p.id, p.slug, p.title,
         (select count(*)::int from product_images pi where pi.product_id = p.id) as img_count
  from products p
  where p.status = 'published'
  order by p.title
`);

let ready = 0;
const pending = [];

for (const r of rows.rows) {
  const has = files.has(`${r.slug}.jpg`);
  if (has) ready++;
  pending.push({ ...r, has });
}

console.log(`${ready}/${rows.rows.length} published products have a sourced image`);

for (const p of pending) {
  console.log(`  ${p.has ? "✓" : "✗"} ${p.title}  (${p.img_count} rows)`);
}

if (!write) {
  console.log("\npreview only — run with --write to apply");
  await c.end();
  process.exit(0);
}

let updated = 0;
let inserted = 0;
let removedPlaceholders = 0;
for (const p of pending) {
  if (!p.has) continue;
  const src = `/images/products/${p.slug}.jpg`;

  const res = await c.query(
    `update product_images set url = $1, source = 'curated'
     where product_id = $2 and position = 0`,
    [src, p.id],
  );
  if (res.rowCount > 0) {
    updated += res.rowCount;
  } else {
    await c.query(
      `insert into product_images (id, product_id, url, alt, position, source)
       values ($1, $2, $3, $4, 0, 'curated')`,
      [`img_${p.slug}`.slice(0, 60), p.id, src, p.title],
    );
    inserted++;
  }

  // The seed wrote three `picsum.photos` slots per product so the gallery had
  // thumbnails. Only slot 0 now holds a real photograph, so the other two
  // would render as unrelated stock photos next to it — drop them rather than
  // ship a gallery where two of three images show the wrong thing.
  const dropped = await c.query(
    `delete from product_images
     where product_id = $1 and position > 0 and url like '%picsum.photos%'`,
    [p.id],
  );
  removedPlaceholders += dropped.rowCount;
}

console.log(
  `\nupdated ${updated} rows, inserted ${inserted}, removed ${removedPlaceholders} picsum placeholders`,
);

/* -------------------------------------------------------------------------- */
/* Category covers                                                            */
/* -------------------------------------------------------------------------- */

if (doCategories) {
  const catFiles = new Set(await readdir(CAT_DIR).catch(() => []));
  const cats = await c.query(`select id, name, slug from categories order by position`);

  let catUpdated = 0;
  for (const row of cats.rows) {
    if (!catFiles.has(`${row.slug}.jpg`)) {
      console.log(`  ✗ ${row.name} (no file)`);
      continue;
    }
    const src = `/images/categories/${row.slug}.jpg`;
    const res = await c.query(`update categories set image_url = $1 where id = $2`, [
      src,
      row.id,
    ]);
    catUpdated += res.rowCount;
    console.log(`  ✓ ${row.name} -> ${src}`);
  }
  console.log(`\ncategory covers applied: ${catUpdated}/${cats.rows.length}`);
}

await c.end();
