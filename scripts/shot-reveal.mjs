/**
 * Scrolling capture + reveal audit for the homepage.
 *
 * Full-page screenshots don't scroll, so IntersectionObserver-driven `Reveal`
 * sections below the fold stay at opacity:0 and photograph as blank bands.
 * This script scrolls the page the way a user would, reports any section that
 * is still invisible, then captures.
 *
 *   node scripts/shot-reveal.mjs
 */

import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = process.env.SHOT_OUT ?? "screenshots-v4/reveal";
await mkdir(out, { recursive: true });

const [vw, vh] = (process.env.SHOT_VP ?? "1440,900").split(",").map(Number);
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: vw, height: vh } });

await page.goto(`${base}/`, { waitUntil: "networkidle", timeout: 90000 });

// Scroll through the whole document like a user, so every observer fires.
await page.evaluate(async () => {
  const step = 400;
  for (let y = 0; y <= document.body.scrollHeight; y += step) {
    window.scrollTo(0, y);
    await new Promise((r) => setTimeout(r, 140));
  }
  window.scrollTo(0, 0);
});
await page.waitForTimeout(1500);

const hidden = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll("section, [class*='reveal'], [class*='Reveal']").forEach((el) => {
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    if (rect.height > 60 && (cs.opacity === "0" || cs.visibility === "hidden")) {
      out.push(
        `${el.tagName.toLowerCase()}.${(el.className || "").toString().slice(0, 60)} h=${Math.round(rect.height)}`,
      );
    }
  });
  return out;
});

console.log(`still-invisible sections after scroll: ${hidden.length}`);
hidden.forEach((h) => console.log(`   ${h}`));

const broken = await page.evaluate(
  () => Array.from(document.images).filter((i) => i.naturalWidth === 0).length,
);
console.log(`broken images: ${broken}`);

await page.screenshot({ path: `${out}/home-scrolled.png`, fullPage: true });
console.log(`captured ${out}/home-scrolled.png`);

await browser.close();
