import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = process.env.SHOT_OUT ?? "screenshots";
const routes = (process.env.SHOT_ROUTES ?? "/").split(",");

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

for (const viewport of [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
]) {
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
  });
  for (const route of routes) {
    const slug = route.replace(/\W+/g, "-") || "root";
    await page.goto(`${base}${route}`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/${slug}-${viewport.name}.png` });
    console.log(`captured ${slug} @ ${viewport.name}`);
  }
  await page.close();
}

await browser.close();
