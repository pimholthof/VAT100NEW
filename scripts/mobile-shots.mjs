import { chromium } from "@playwright/test";

const BASE = "http://localhost:3000";
const pages = [
  { name: "landing", path: "/" },
  { name: "register", path: "/register" },
  { name: "login", path: "/login" },
  { name: "404", path: "/deze-pagina-bestaat-niet-xyz" },
];

// Optioneel: zet PLAYWRIGHT_EXECUTABLE_PATH als de gebundelde browser niet
// matcht met de geïnstalleerde Playwright-versie in deze omgeving.
const launchOpts = process.env.PLAYWRIGHT_EXECUTABLE_PATH
  ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH }
  : {};
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

for (const p of pages) {
  try {
    await page.goto(BASE + p.path, { waitUntil: "networkidle", timeout: 30000 });
    await page.waitForTimeout(700);
    await page.screenshot({ path: `/tmp/shot-${p.name}.png`, fullPage: true });
    console.log("OK", p.name);
  } catch (e) {
    console.log("FAIL", p.name, e.message);
  }
}

await browser.close();
console.log("done");
