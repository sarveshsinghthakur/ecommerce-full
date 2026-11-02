/**
 * Builds a single HTML contact sheet of every downloaded product image,
 * labelled with the product title, so each one can be eyeballed for a match.
 *
 *   node scripts/contact-sheet.mjs
 *
 * Writes `screenshots-v3/contact-sheet.html` and opens it for screenshotting.
 */

import { readdir, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Client } from "pg";

const DIR = "public/images/products";
const OUT = "screenshots-v3/contact-sheet.html";

const env = readFile(".env.local", "utf8");
const url = (await env).match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const c = new Client({ connectionString: url });
await c.connect();
const rows = await c.query(`
  select p.slug, p.title, p.brand, cat.name as category
  from products p
  left join categories cat on cat.id = p.category_id
  where p.status = 'published'
  order by cat.name, p.title
`);
await c.end();

const files = new Set(await readdir(DIR));
await mkdir("screenshots-v3", { recursive: true });

let html = `<!doctype html><meta charset="utf-8"><title>Contact sheet</title>
<style>
  body{font:14px/1.4 system-ui;margin:0;padding:24px;background:#0f172a;color:#e2e8f0}
  h1{font-size:18px;margin:0 0 4px} .sub{color:#94a3b8;margin:0 0 20px;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px}
  .card.missing{border-color:#b91c1c;background:#2d1414}
  .card img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px;background:#0f172a}
  .t{font-weight:600;margin-top:6px;font-size:12px;line-height:1.3}
  .b{color:#94a3b8;font-size:11px;margin-top:2px}
  .s{font-family:ui-monospace,monospace;color:#64748b;font-size:10px;margin-top:3px;word-break:break-all}
  .miss{color:#fca5a5;font-weight:700;font-size:11px;margin-top:6px}
</style>
<h1>Product image contact sheet</h1>
<p class="sub">${rows.rows.length} published products</p>
<div class="grid">`;

let missing = 0;
for (const r of rows.rows) {
  const has = files.has(`${r.slug}.jpg`);
  if (!has) missing++;
  html += `<div class="card${has ? "" : " missing"}">`;
  if (has) {
    html += `<img src="${pathToFileURL(resolve(DIR, `${r.slug}.jpg`)).href}" alt="">`;
  } else {
    html += `<div style="aspect-ratio:1"></div><div class="miss">NO IMAGE YET</div>`;
  }
  html += `<div class="t">${r.title}</div>
    <div class="b">${r.brand ?? "-"} · ${r.category ?? "-"}</div>
    <div class="s">${r.slug}</div></div>`;
}
html += `</div>`;

await writeFile(OUT, html);
console.log(`wrote ${OUT}  (${rows.rows.length - missing}/${rows.rows.length} have images, ${missing} missing)`);
