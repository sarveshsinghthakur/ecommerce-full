/**
 * Health-checks every image on the key storefront routes.
 *
 *   node scripts/verify-images.mjs
 *
 * For each route: forces lazy images eager, waits for real pixels, then
 * reports images that failed to decode, still point at a placeholder host
 * (picsum/unsplash/loremflickr/googleusercontent), or reference a local
 * path that 404s. Category tiles are listed explicitly so a missing cover
 * is obvious.
 */

import { chromium } from "playwright";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const browser = await chromium.launch({ channel: "msedge" });

const routes = ["/", "/products", "/categories", "/category/bags-and-luggage"];
const STALE = /picsum|source\.unsplash|loremflickr|googleusercontent/i;

let totalBroken = 0;
let totalStale = 0;

for (const path of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.evaluate(() => {
    document.querySelectorAll("img[loading='lazy']").forEach((i) => (i.loading = "eager"));
  });
  // Wait for every image to finish attempting a load.
  await page.evaluate(async () => {
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((res) => {
              img.addEventListener("load", res, { once: true });
              img.addEventListener("error", res, { once: true });
              setTimeout(res, 8000);
            }),
      ),
    );
  });
  await page.waitForTimeout(800);

  const report = await page.evaluate((stalePattern) => {
    const stale = new RegExp(stalePattern, "i");
    const imgs = Array.from(document.images);
    return {
      total: imgs.length,
      broken: imgs
        .filter((i) => i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src || "(no src)"),
      stale: imgs.filter((i) => stale.test(i.currentSrc || i.src)).map((i) => i.currentSrc || i.src),
      categories: Array.from(document.querySelectorAll('a[href^="/category/"] img'))
        .map((i) => i.currentSrc || i.src)
        .filter((s) => s && !s.startsWith("data:")),
    };
  }, STALE.source);

  totalBroken += report.broken.length;
  totalStale += report.stale.length;

  console.log(`\n=== ${path}`);
  console.log(`  images: ${report.total}   broken: ${report.broken.length}   stale-host: ${report.stale.length}`);
  if (report.broken.length) console.log(`  BROKEN: ${report.broken.slice(0, 6).join("\n          ")}`);
  if (report.stale.length) console.log(`  STALE:  ${report.stale.slice(0, 6).join("\n          ")}`);

  if (report.categories.length) {
    const local = report.categories.filter((s) => s.includes("/images/categories/"));
    const remote = report.categories.filter((s) => !s.includes("/images/categories/"));
    console.log(`  category tiles: ${report.categories.length} (${local.length} local cover, ${remote.length} other)`);
    if (remote.length) console.log(`  NON-LOCAL: ${remote.slice(0, 4).join("\n             ")}`);
  }

  await page.close();
}

await browser.close();

console.log(`\n----------------------------------------`);
console.log(`TOTAL broken: ${totalBroken}   stale-host: ${totalStale}`);
process.exit(totalBroken + totalStale > 0 ? 1 : 0);
