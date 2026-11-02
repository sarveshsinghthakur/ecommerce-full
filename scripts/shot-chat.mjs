import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = "screenshots-v5";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.goto(`${base}/admin/chat`, { waitUntil: "networkidle", timeout: 90000 });
await page.waitForTimeout(2000);

// Check for errors
const errors = await page.evaluate(() => {
  return Array.from(document.querySelectorAll("p, span, div"))
    .filter((el) => el.textContent?.toLowerCase().includes("error") || el.textContent?.toLowerCase().includes("failed"))
    .map((el) => el.textContent);
});

await page.screenshot({ path: `${out}/chat-page.png`, fullPage: true });
console.log(`captured ${out}/chat-page.png`);
console.log(`errors on page: ${errors.length ? errors.join(", ") : "none"}`);

await browser.close();