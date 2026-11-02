import { Client } from "pg";

const env = await import("node:fs").then((fs) =>
  fs.readFileSync(".env.local", "utf8"),
);
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const c = new Client({ connectionString: url });
await c.connect();

const picsum = await c.query(
  `select count(*)::int as n from product_images where url like '%picsum%'`,
);
console.log(`picsum rows left in product_images: ${picsum.rows[0].n}`);

const sample = await c.query(`
  select p.title, pi.url, pi.position, pi.source
  from product_images pi join products p on p.id = pi.product_id
  where p.status = 'published'
  order by p.title, pi.position
  limit 8
`);
for (const r of sample.rows) console.log(`  ${r.title} [pos ${r.position}] ${r.url}`);

const counts = await c.query(`
  select count(*)::int as rows, count(distinct product_id)::int as products
  from product_images
`);
console.log(`product_images: ${counts.rows[0].rows} rows / ${counts.rows[0].products} products`);

const cats = await c.query(
  `select count(*)::int as n, count(image_url) as with_img from categories`,
);
console.log(`categories: ${cats.rows[0].n} total, ${cats.rows[0].with_img} with image_url`);

await c.end();
