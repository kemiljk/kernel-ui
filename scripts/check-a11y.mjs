#!/usr/bin/env node
/**
 * Accessibility check for every component, run with axe-core in a real
 * browser against the built docs site (apps/docs/dist), in light and dark.
 *
 * Scoped to each page's live examples (`.docs-example` and the playground
 * stage), because those are the components Kernel ships; the docs site's own
 * chrome is not part of the published packages. Fails on any serious or
 * critical violation; minor and moderate ones are listed but don't fail.
 *
 * Usage: build the docs first (`bun run docs:build`), then
 *   node scripts/check-a11y.mjs            # all components
 *   node scripts/check-a11y.mjs button tabs   # only these slugs
 *
 * Needs a Chromium for Playwright: in CI `bunx playwright install chromium`;
 * locally it falls back to installed Chrome.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
if (!existsSync(dist)) {
  console.error("check-a11y: apps/docs/dist not found. Run `bun run docs:build` first.");
  process.exit(1);
}

const registry = JSON.parse(readFileSync(join(root, "apps/docs/public/registry.json"), "utf8"));
const only = process.argv.slice(2);
const slugs = registry.components
  .filter((c) => c.status === "available")
  .map((c) => c.slug)
  .filter((slug) => only.length === 0 || only.includes(slug));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) {
    res.writeHead(404).end();
    return;
  }
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

const SCHEMES = ["light", "dark"];
const failures = [];
let checked = 0;
for (const scheme of SCHEMES) {
  const context = await browser.newContext({ colorScheme: scheme });
  await context.addInitScript((s) => {
    try {
      localStorage.setItem("kernel:color-scheme", s);
    } catch {}
  }, scheme);
  const page = await context.newPage();
  for (const slug of slugs) {
    await page.goto(`${base}/components/${slug}/`, { waitUntil: "networkidle" });
    // Let client islands hydrate and entrance animations settle.
    await page.waitForTimeout(300);
    const regions = await page.locator(".docs-example, .prop-playground-stage").count();
    if (regions === 0) continue;
    const results = await new AxeBuilder({ page })
      .include(".docs-example")
      .include(".prop-playground-stage")
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"])
      .analyze();
    checked++;
    for (const violation of results.violations) {
      const entry = { slug, scheme, id: violation.id, impact: violation.impact, help: violation.help, nodes: violation.nodes.map((n) => n.target.join(" ")).slice(0, 3) };
      if (violation.impact === "serious" || violation.impact === "critical") failures.push(entry);
      else console.log(`  note  ${slug} (${scheme}) ${violation.id}: ${violation.help} — ${entry.nodes.join(", ")}`);
    }
  }
  await context.close();
}
await browser.close();
server.close();

if (failures.length) {
  console.error(`\ncheck-a11y: ${failures.length} serious/critical violation(s):\n`);
  for (const f of failures) console.error(`  ✗ ${f.slug} (${f.scheme}) [${f.impact}] ${f.id}: ${f.help}\n      ${f.nodes.join("\n      ")}`);
  process.exit(1);
}
console.log(`check-a11y: ${checked} page × scheme checks, no serious or critical axe violations.`);
