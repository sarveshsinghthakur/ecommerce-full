/**
 * Contact sheet for the category cover images.
 *
 *   node scripts/contact-sheet-categories.mjs
 *   node scripts/shot-contact-sheet-categories.mjs
 */

import { readdir, writeFile, mkdir } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { Client } from "pg";

const DIR = "public/images/categories";
const OUT = "screenshots-v3/contact-sheet-categories.html";

const env = await import("node:fs").then((fs) =>
  fs.readFileSync(".env.local", "utf8"),
);
const url = env.match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^['"]|['"]$/g, "");

const c = new Client({ connectionString: url });
await c.connect();
const cats = await c.query(`select name, slug from categories order by position`);
await c.end();

const files = new Set(await readdir(DIR).catch(() => []));
await mkdir("screenshots-v3", { recursive: true });

let html = `<!doctype html><meta charset="utf-8"><title>Category covers</title>
<style>
  body{font:14px/1.4 system-ui;margin:0;padding:24px;background:#0f172a;color:#e2e8f0}
  h1{font-size:18px;margin:0 0 4px} .sub{color:#94a3b8;margin:0 0 20px;font-size:12px}
  .grid{display:grid;grid-template-columns:repeat(5,1fr);gap:14px}
  .card{background:#1e293b;border:1px solid #334155;border-radius:10px;padding:8px}
  .card.missing{border-color:#b91c1c;background:#2d1414}
  .card img{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:6px;background:#0f172a}
  .t{font-weight:600;margin-top:6px;font-size:12px}
  .s{font-family:ui-monospace,monospace;color:#64748b;font-size:10px;margin-top:3px}
  .miss{color:#fca5a5;font-weight:700;font-size:11px;margin-top:6px}
</style>
<h1>Category cover sheet</h1>
<p class="sub">${cats.rows.length} categories</p>
<div class="grid">`;

let missing = 0;
for (const r of cats.rows) {
  const has = files.has(`${r.slug}.jpg`);
  if (!has) missing++;
  html += `<div class="card${has ? "" : " missing"}">`;
  if (has) {
    html += `<img src="${pathToFileURL(resolve(DIR, `${r.slug}.jpg`)).href}" alt="">`;
  } else {
    html += `<div style="aspect-ratio:16/10"></div><div class="miss">NO IMAGE</div>`;
  }
  html += `<div class="t">${r.name}</div><div class="s">${r.slug}</div></div>`;
}
html += `</div>`;

await writeFile(OUT, html);
console.log(`wrote ${OUT} (${cats.rows.length - missing}/${cats.rows.length} present)`);
