/**
 * Fresh full-page captures of the key routes at desktop + mobile, written
 * under a unique per-run directory so no two runs can collide (and so image
 * previews are never confused between runs).
 *
 *   node scripts/shot-verify.mjs
 *
 * Lazy images are forced eager and awaited before capture — otherwise a
 * full-page screenshot races the IntersectionObserver and renders grey boxes.
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
const out = `screenshots-v4/run-${stamp}`;
await mkdir(out, { recursive: true });

const routes = [
  { name: "home", path: "/" },
  { name: "products", path: "/products" },
  { name: "category", path: "/category/bags-and-luggage" },
];

const browser = await chromium.launch({ channel: "msedge" });

for (const vp of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
  for (const r of routes) {
    await page.goto(`${base}${r.path}`, { waitUntil: "networkidle", timeout: 90000 });
    await page.evaluate(() => {
      document.querySelectorAll("img[loading='lazy']").forEach((i) => (i.loading = "eager"));
    });
    await page.evaluate(async () => {
      await Promise.all(
        Array.from(document.images).map((img) =>
          img.complete && img.naturalWidth > 0
            ? Promise.resolve()
            : new Promise((res) => {
                img.addEventListener("load", res, { once: true });
                img.addEventListener("error", res, { once: true });
                setTimeout(res, 8000);
              }),
        ),
      );
    });
    await page.waitForTimeout(700);

    const bad = await page.evaluate(
      () =>
        Array.from(document.images).filter((i) => i.naturalWidth === 0).length,
    );

    const file = `${out}/${r.name}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(`captured ${file}  (broken imgs: ${bad})`);
  }
  await page.close();
}

await browser.close();
console.log(`\noutput: ${out}`);
