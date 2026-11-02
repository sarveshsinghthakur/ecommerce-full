import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";

const base = process.env.SHOT_BASE ?? "http://localhost:3000";
const out = "screenshots-v3";
await mkdir(out, { recursive: true });

const browser = await chromium.launch({ channel: "msedge" });
const context = await browser.newPage({ viewport: { width: 1440, height: 900 } });

// 1. Collect real product ids from the listing.
await context.goto(`${base}/products`, { waitUntil: "networkidle", timeout: 90000 });
const ids = await context.evaluate(() =>
  Array.from(document.querySelectorAll('a[href^="/product/"]'))
    .map((a) => a.getAttribute("href"))
    .filter((h) => typeof h === "string" && h.length > 0)
    .slice(0, 8),
);
console.log("product hrefs:", ids.length);

// Map hrefs -> ids by visiting a product page is overkill; the wishlist API
// resolves ids, so pull real ids from the catalogue through the suggest route.
const suggest = await context.evaluate(async () => {
  const res = await fetch("/api/search/suggest?q=back");
  const data = await res.json();
  return (data.items || []).map((i) => i.id);
});
console.log("suggest ids:", suggest.length);

// 2. Seed the localStorage wishlist.
await context.evaluate((productIds) => {
  localStorage.setItem("loop_wishlist", JSON.stringify(productIds));
}, suggest);

// 3. Sign in through the local test-mode shim.
const login = await context.request.post(`${base}/api/auth/session`, {
  data: {
    testEmail: "shopper@example.com",
    testName: "Spatial Shopper",
    testPassword: "spatial-pass-123",
    testAction: "sign_up",
  },
  failOnStatusCode: false,
});
console.log("auth status:", login.status());
if (!login.ok()) console.log("auth body:", (await login.text()).slice(0, 300));

// 4. Capture the wishlist.
await context.goto(`${base}/wishlist`, { waitUntil: "networkidle", timeout: 90000 });
await context.waitForTimeout(2000);
await context.screenshot({ path: `${out}/wishlist-desktop.png`, fullPage: true });
console.log("captured wishlist desktop @", context.url());

await context.close();
await browser.close();
