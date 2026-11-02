import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = process.env.SHOT_OUT ?? "screenshots";

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const routes = [
  ["home", "/"],
  ["products", "/products"],
  ["about", "/about"],
];

for (const [name, path] of routes) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 60000 });
  // wait for hydration: the first reveal must flip to visible before we scroll
  await page.waitForSelector("[data-reveal].is-visible", { timeout: 20000 });
  // step-scroll so every IntersectionObserver reveal fires before capture
  await page.evaluate(async () => {
    const step = 450;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 140));
    }
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise((r) => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });
  // let reveals finish their transition and lazy images settle
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(2000);
  const hidden = await page.evaluate(
    () => document.querySelectorAll("[data-reveal]:not(.is-visible)").length,
  );
  console.log(`${name}: ${hidden} still hidden`);
  await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
  console.log(`captured ${name}`);
}

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mobile.goto(`${base}/`, { waitUntil: "networkidle", timeout: 60000 });
await mobile.waitForTimeout(1500);
await mobile.screenshot({ path: `${out}/home-mobile.png` });
console.log("captured home-mobile");

await browser.close();
