import { chromium } from "playwright";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const file = resolve("screenshots-v3/contact-sheet-categories.html");
const browser = await chromium.launch({ channel: "msedge" });
const page = await browser.newPage({ viewport: { width: 1500, height: 700 } });
await page.goto(pathToFileURL(file).href, { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
await page.screenshot({
  path: "screenshots-v3/contact-sheet-categories.png",
  fullPage: true,
});
console.log("captured contact-sheet-categories.png");
await browser.close();
