import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = process.env.SHOT_OUT ?? "screenshots/audit";

await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });

const routes = [
  ["home", "/"],
  ["products", "/products"],
  ["categories", "/categories"],
  ["cart", "/cart"],
  ["checkout", "/checkout"],
  ["search", "/search?q=shirt"],
  ["product", null], // resolved below: first product slug
  ["category", null], // resolved below: first category slug
];

async function revealAll(page) {
  await page.evaluate(async () => {
    const step = 500;
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 100));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

// resolve dynamic slugs
const probe = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await probe.goto(`${base}/products`, { waitUntil: "networkidle", timeout: 90000 });
const productHref = await probe.evaluate(() => {
  const a = document.querySelector('a[href^="/product/"]');
  return a ? a.getAttribute("href") : null;
});
await probe.goto(`${base}/categories`, { waitUntil: "networkidle", timeout: 90000 });
const categoryHref = await probe.evaluate(() => {
  const a = document.querySelector('a[href^="/category/"]');
  return a ? a.getAttribute("href") : null;
});
await probe.close();

const resolved = routes.map(([name, path]) => {
  if (name === "product") return [name, productHref ?? "/products"];
  if (name === "category") return [name, categoryHref ?? "/categories"];
  return [name, path];
});
console.log("resolved:", JSON.stringify(resolved));

const errors = [];
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on("console", (m) => {
  if (m.type() === "error") errors.push(`[console] ${m.text()}`);
});
page.on("pageerror", (e) => errors.push(`[pageerror] ${e.message}`));
page.on("requestfailed", (r) =>
  errors.push(`[requestfailed] ${r.url()} — ${r.failure()?.errorText}`),
);

for (const [name, path] of resolved) {
  await page.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await revealAll(page);
  await page.screenshot({ path: `${out}/${name}-desktop.png`, fullPage: true });
  console.log(`captured ${name}-desktop`);
}

// mobile pass
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } });
for (const [name, path] of resolved.filter(([n]) =>
  ["home", "products", "product", "category", "cart", "checkout"].includes(n),
)) {
  await mobile.goto(`${base}${path}`, { waitUntil: "networkidle", timeout: 90000 });
  await revealAll(mobile);
  await mobile.screenshot({ path: `${out}/${name}-mobile.png`, fullPage: true });
  console.log(`captured ${name}-mobile`);
}

await browser.close();
console.log("\n=== console/network errors ===");
console.log(errors.length ? errors.join("\n") : "(none)");
