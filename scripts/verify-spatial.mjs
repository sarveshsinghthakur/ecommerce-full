import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = "screenshots-v3";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

const cases = [
  { name: "home-dark", route: "/", dark: true, reduced: false },
  { name: "product-dark", route: "/product/nash-daypack-25l", dark: true, reduced: false },
  { name: "home-reduced-motion", route: "/", dark: false, reduced: true },
  { name: "products-dark", route: "/products", dark: true, reduced: false },
];

for (const c of cases) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: c.dark ? "dark" : "light",
    reducedMotion: c.reduced ? "reduce" : "no-preference",
  });
  const page = await context.newPage();
  await page.goto(`${base}${c.route}`, { waitUntil: "networkidle", timeout: 90000 });
  // Force the class-based dark toggle the app actually uses.
  await page.evaluate((dark) => {
    document.documentElement.classList.toggle("dark", dark);
  }, c.dark);
  await page.waitForTimeout(1800);
  await page.screenshot({ path: `${out}/${c.name}.png` });
  console.log("captured", c.name);
  await context.close();
}

// Keyboard + reduced-motion assertions on the product page.
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const page = await context.newPage();
await page.goto(`${base}/product/nash-daypack-25l`, {
  waitUntil: "networkidle",
  timeout: 90000,
});

// Under reduced motion every reveal must already be visible — nothing may be
// left at opacity 0 waiting for an observer that never fires.
const hidden = await page.evaluate(() => {
  const nodes = Array.from(document.querySelectorAll("[data-reveal]"));
  return nodes.filter((n) => {
    const s = getComputedStyle(n);
    return parseFloat(s.opacity) < 0.9;
  }).length;
});
console.log("reduced-motion hidden reveal blocks:", hidden, hidden === 0 ? "(PASS)" : "(FAIL)");

// Tab through and make sure focus lands on real, visible elements.
const focusTrail = [];
for (let i = 0; i < 14; i++) {
  await page.keyboard.press("Tab");
  const info = await page.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      label: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 32),
      visible: s.visibility !== "hidden" && parseFloat(s.opacity) > 0,
      hasOutline: s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0,
    };
  });
  if (info) focusTrail.push(info);
}
console.log("focusable elements reached:", focusTrail.length);
console.log("all visible:", focusTrail.every((f) => f.visible) ? "PASS" : "FAIL");
console.log(
  "sample focus targets:",
  focusTrail.slice(0, 8).map((f) => `${f.tag}:${f.label}`).join(" | "),
);

await context.close();
await browser.close();
