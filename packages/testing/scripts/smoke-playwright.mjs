#!/usr/bin/env node
/**
 * Smoke test for the published Playwright helpers (dist/playwright.js) and
 * the browser bundle, against the built docs site. Run after
 * `bun run build` here and `bun run docs:build` at the repo root:
 *   node packages/testing/scripts/smoke-playwright.mjs
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { assertComponentInPage, checkPageInPage, checkPatternInPage } from "../dist/playwright.js";

const dist = new URL("../../../apps/docs/dist", import.meta.url).pathname;
if (!existsSync(dist)) {
  console.error("smoke-playwright: apps/docs/dist not found. Run `bun run docs:build` first.");
  process.exit(1);
}
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".woff2": "font/woff2" };
const server = createServer((req, res) => {
  let file = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

let browser;
try {
  browser = await chromium.launch();
} catch {
  browser = await chromium.launch({ channel: "chrome" });
}
const page = await browser.newPage();
const failures = [];
try {
  await page.goto(`${base}/components/tabs/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  const tabs = await checkPatternInPage(page, ".docs-example", "tabs");
  if (!tabs.passed || tabs.environment !== "browser") failures.push(`checkPatternInPage tabs: ${JSON.stringify(tabs.issues)}`);
  await assertComponentInPage(page, ".docs-example", "Tabs");
  const pageResult = await checkPageInPage(page, ".docs-example");
  if (!pageResult.found.Tabs) failures.push(`checkPageInPage found ${JSON.stringify(pageResult.found)}`);
  // A failing check throws with the rule in the message.
  await page.evaluate(() => document.querySelector(".docs-example [role=tab]")?.setAttribute("aria-controls", "nope"));
  const threw = await assertComponentInPage(page, ".docs-example", "Tabs").then(() => null, (error) => error.message);
  if (!threw?.includes("tabs/controls-panel")) failures.push(`assertComponentInPage didn't throw on a broken tab: ${threw}`);
} finally {
  await browser.close();
  server.close();
}
if (failures.length) {
  console.error(`smoke-playwright failed:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log("smoke-playwright: checkPatternInPage, assertComponentInPage and checkPageInPage work in Chromium.");
