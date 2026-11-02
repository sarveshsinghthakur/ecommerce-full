import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = "screenshots-v4";
await mkdir(out, { recursive: true });

const routes = [
  { name: "products", path: "/products" },
  { name: "home", path: "/" },
  { name: "category", path: "/category/bags-and-luggage" },
];

const browser = await chromium.launch({ channel: "msedge" });

for (const r of routes) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(`${base}${r.path}`, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(1500);
  // Lazy images never finish loading for a full-page capture (Playwright's own
  // scrolling races the IntersectionObserver), which renders grey boxes. Strip
  // the attribute and wait for every image to report real pixels instead.
  await page.evaluate(async () => {
    document.querySelectorAll("img[loading='lazy']").forEach((img) => {
      img.loading = "eager";
    });
    const imgs = Array.from(document.images);
    await Promise.all(
      imgs.map((img) =>
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
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${out}/full-${r.name}.png`, fullPage: true });

  // Report images that failed to decode or still point at the old placeholder.
  const bad = await page.evaluate(() =>
    Array.from(document.querySelectorAll("img"))
      .filter((i) => i.naturalWidth === 0 || /picsum|placeholder/i.test(i.currentSrc || i.src))
      .map((i) => i.currentSrc || i.src),
  );
  console.log(`${r.name}: captured; broken/stale imgs = ${bad.length}`);
  if (bad.length) console.log("   " + bad.slice(0, 5).join("\n   "));
  await page.close();
}

await browser.close();
