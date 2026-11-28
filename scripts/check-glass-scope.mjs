#!/usr/bin/env node
/**
 * Scope check for the docs site's Liquid Glass (apps/docs/src/styles/glass.css).
 *
 * The glass is site chrome only. Live component examples (`.docs-example`)
 * and playground stages (`.prop-playground-stage`) must render exactly as
 * Kernel ships them. For every component page this records the computed
 * style of every element in those regions (and its ::before/::after), then
 * removes glass.css's rules from the page and records them again. Any
 * difference fails.
 *
 * glass.css is bundled into the layout's stylesheet, so its rules are found
 * by content: every one lives in one `@media (forced-colors: none)` block that
 * declares the `--glass-*` tokens and the `.site-header` hook. The check fails
 * if it can't find that block, so it can't pass by testing nothing.
 *
 * Usage: build the docs first (`bun run docs:build`), then
 *   node scripts/check-glass-scope.mjs              # every component page
 *   node scripts/check-glass-scope.mjs button tabs  # only these slugs
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
if (!existsSync(dist)) {
  console.error("check-glass-scope: apps/docs/dist not found. Run `bun run docs:build` first.");
  process.exit(1);
}

const registry = JSON.parse(readFileSync(join(root, "apps/docs/public/registry.json"), "utf8"));
const only = process.argv.slice(2);
const slugs = registry.components
  .filter((c) => c.status === "available")
  .map((c) => c.slug)
  .filter((slug) => only.length === 0 || only.includes(slug));

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
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

/** Runs in the page: computed styles for every node in the example regions. */
function snapshot() {
  const out = [];
  const nodes = document.querySelectorAll(
    ".docs-example, .docs-example *, .prop-playground-stage, .prop-playground-stage *",
  );
  nodes.forEach((el, i) => {
    for (const pseudo of [null, "::before", "::after"]) {
      const cs = getComputedStyle(el, pseudo);
      const props = {};
      for (let j = 0; j < cs.length; j++) props[cs[j]] = cs.getPropertyValue(cs[j]);
      out.push({ key: `${i}:${el.tagName.toLowerCase()}${el.className && typeof el.className === "string" ? "." + el.className.trim().split(/\s+/).join(".") : ""}${pseudo ?? ""}`, props });
    }
  });
  return out;
}

/** Runs in the page: deletes glass.css's block(s). Returns how many. */
function removeGlass() {
  let removed = 0;
  for (const sheet of document.styleSheets) {
    let rules;
    try {
      rules = sheet.cssRules;
    } catch {
      continue;
    }
    for (let i = rules.length - 1; i >= 0; i--) {
      const text = rules[i].cssText;
      if (rules[i] instanceof CSSMediaRule && text.includes("--glass-") && text.includes("site-header")) {
        sheet.deleteRule(i);
        removed++;
      }
    }
  }
  return removed;
}

function diff(a, b) {
  const problems = [];
  const byKey = new Map(b.map((entry) => [entry.key, entry.props]));
  for (const { key, props } of a) {
    const other = byKey.get(key);
    if (!other) {
      problems.push(`${key}: missing after`);
      continue;
    }
    for (const [prop, value] of Object.entries(props)) {
      // glass.css's own tokens are declared on :root, so they inherit into
      // every element. Nothing inside an example reads them; any property
      // that did would show up below as a real difference.
      if (prop.startsWith("--glass-")) continue;
      if (other[prop] !== value) problems.push(`${key} ${prop}: "${value}" with glass, "${other[prop]}" without`);
    }
  }
  return problems;
}

const failures = [];
let checked = 0;
for (const scheme of ["light", "dark"]) {
  const context = await browser.newContext({ colorScheme: scheme });
  await context.addInitScript((s) => {
    try {
      localStorage.setItem("kernel:color-scheme", s);
    } catch {}
  }, scheme);
  const page = await context.newPage();
  for (const slug of slugs) {
    await page.goto(`${base}/components/${slug}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(300);
    if ((await page.locator(".docs-example, .prop-playground-stage").count()) === 0) continue;
    // Both reads and the removal run in one synchronous evaluate, so no
    // timer (a streaming demo, a cycling status) can change the DOM between
    // them. Animations are paused first so they compare like for like.
    const result = await page.evaluate(
      ({ snapshotSrc, removeSrc }) => {
        const snap = new Function(`return (${snapshotSrc})()`);
        const remove = new Function(`return (${removeSrc})()`);
        // Without this, removing a rule would start a transition and the
        // second read would still report the old (glass) value.
        const noTransitions = document.createElement("style");
        noTransitions.textContent = "*, *::before, *::after { transition: none !important; }";
        document.head.append(noTransitions);
        document.getAnimations().forEach((a) => a.pause());
        const withGlass = snap();
        const removed = remove();
        document.getAnimations().forEach((a) => a.pause());
        const withoutGlass = snap();
        return { withGlass, withoutGlass, removed };
      },
      { snapshotSrc: snapshot.toString(), removeSrc: removeGlass.toString() },
    );
    if (result.removed === 0) {
      failures.push(`${slug} (${scheme}): glass.css's rules not found in the page`);
      continue;
    }
    const problems = diff(result.withGlass, result.withoutGlass);
    checked++;
    if (problems.length) failures.push(`${slug} (${scheme}):\n    ${problems.slice(0, 10).join("\n    ")}${problems.length > 10 ? `\n    …and ${problems.length - 10} more` : ""}`);
  }
  await context.close();
}

await browser.close();
server.close();

if (failures.length) {
  console.error(`check-glass-scope: glass.css changes live examples:\n  ${failures.join("\n  ")}`);
  process.exit(1);
}
console.log(`check-glass-scope: ${checked} page/scheme pair(s), examples identical with and without glass.css.`);
