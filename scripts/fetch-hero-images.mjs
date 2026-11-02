/**
 * Downloads the hero carousel's three images, which are currently hotlinked
 * from Google's `lh3.googleusercontent.com` CDN. Hotlinking means the banner
 * breaks the moment Google rotates the token, so they are stored locally like
 * every other image in the storefront.
 *
 *   node scripts/fetch-hero-images.mjs
 */

import { mkdir, writeFile } from "node:fs/promises";
import { readFileSync } from "node:fs";

const OUT_DIR = "public/images/editorial";
const SRC = "src/components/store/hero-carousel.tsx";

const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/131.0.0.0 Safari/537.36" };

const html = readFileSync(SRC, "utf8");
const urls = [...html.matchAll(/"(https:\/\/lh3\.googleusercontent\.com\/aida-public\/[^"]+)"/g)].map(
  (m) => m[1],
);

console.log(`found ${urls.length} hotlinked hero image(s)`);

await mkdir(OUT_DIR, { recursive: true });

let saved = 0;
for (let i = 0; i < urls.length; i++) {
  const dest = `${OUT_DIR}/hero-${i + 1}.jpg`;
  try {
    const res = await fetch(urls[i], { headers: UA });
    if (!res.ok) {
      console.log(`  ✗ hero-${i + 1}: HTTP ${res.status}`);
      continue;
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/image\//.test(type)) {
      console.log(`  ✗ hero-${i + 1}: unexpected type ${type}`);
      continue;
    }
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`  ✓ hero-${i + 1}.jpg  ${buf.length} bytes  (${type})`);
    saved++;
  } catch (e) {
    console.log(`  ✗ hero-${i + 1}: ${e.message}`);
  }
}

console.log(`\ndownloaded ${saved}/${urls.length} -> ${OUT_DIR}`);
