#!/usr/bin/env node
/**
 * @kernelui-lib/testing in a real browser, against the built docs site's live
 * examples: the APG pattern checks plus what jsdom can't see — the Popover
 * API, modal <dialog> focus, Kernel's CSS (user-select) — and a few real key
 * presses for the behaviour that only trusted events trigger (Escape on a
 * <dialog> and on a popover="auto" menu, with focus returning to the trigger).
 *
 * Usage: build the packages and docs first (`bun run build && bun run docs:build`), then
 *   node scripts/check-patterns.mjs              # the default set below
 *   node scripts/check-patterns.mjs tabs dialog  # only these slugs
 *   node scripts/check-patterns.mjs --verbose    # also list warnings and skips
 *   node scripts/check-patterns.mjs --browser=firefox   # chromium (default), firefox or webkit
 *   node scripts/check-patterns.mjs --browser=all       # each installed engine in turn
 *
 * Install the engines with `bunx playwright install chromium firefox webkit`.
 *
 * Fails on any error-severity issue; warnings are listed with --verbose.
 */
import { createReadStream, existsSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
const bundlePath = join(root, "packages/testing/dist/kernel-testing.global.js");
for (const [path, hint] of [
  [dist, "bun run docs:build"],
  [bundlePath, "bun run --cwd packages/testing build"],
]) {
  if (!existsSync(path)) {
    console.error(`check-patterns: ${path} not found. Run \`${hint}\` first.`);
    process.exit(1);
  }
}
const bundle = readFileSync(bundlePath, "utf8");

const DEFAULT = [
  "tabs", "select", "dialog", "switch", "accordion", "checkbox", "toggle", "radio-group", "slider",
  "dropdown-menu", "context-menu", "combobox", "date-picker", "date-range-picker", "tooltip", "hover-card", "popover", "text-field",
];
const ENGINES = { chromium, firefox, webkit };
const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const browserArg = (() => {
  const i = args.findIndex((a) => a === "--browser" || a.startsWith("--browser="));
  if (i === -1) return "chromium";
  return args[i].includes("=") ? args[i].split("=")[1] : args[i + 1];
})();
const engines = browserArg === "all" ? Object.keys(ENGINES) : browserArg.split(",");
for (const name of engines) {
  if (!ENGINES[name]) {
    console.error(`check-patterns: unknown --browser "${name}". Use chromium, firefox, webkit or all.`);
    process.exit(1);
  }
}
const slugs = args.filter((a, i) => !a.startsWith("--") && !(args[i - 1] === "--browser"));
const targets = slugs.length ? slugs : DEFAULT;

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".txt": "text/plain", ".md": "text/markdown" };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = join(dist, path);
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end();
  res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
  createReadStream(file).pipe(res);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

async function launch(name) {
  try {
    return await ENGINES[name].launch();
  } catch (error) {
    // A locally installed Chrome stands in when Playwright's Chromium isn't downloaded.
    if (name === "chromium") return chromium.launch({ channel: "chrome" });
    throw error;
  }
}

let page;
let engine;
const report = [];
function record(slug, label, result) {
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  report.push({ engine, slug, label, errors, warnings, passes: result.passes.length, skipped: result.skipped, found: result.found });
}
const fail = (slug, label, message) => record(slug, label, { issues: [{ rule: "browser/real-keys", severity: "error", message }], passes: [], skipped: [] });
const pass = (slug, label) => record(slug, label, { issues: [], passes: ["browser/real-keys"], skipped: [] });

/**
 * Waits for the examples' React islands to hydrate instead of guessing a
 * delay: Astro removes an <astro-island>'s `ssr` attribute once its
 * component has hydrated, and `client:visible` islands only hydrate once
 * scrolled into view. Before that, server-rendered markup is on screen but
 * none of its handlers are attached: popovertarget still opens a menu
 * natively, but nothing moves focus into it.
 */
async function waitForHydration() {
  const pending = await page.evaluate(async () => {
    const regions = Array.from(document.querySelectorAll(".docs-example, .prop-playground-stage"));
    const islands = Array.from(document.querySelectorAll("astro-island")).filter((island) =>
      regions.some((region) => region.contains(island) || island.contains(region)),
    );
    const deadline = Date.now() + 15000;
    for (const island of islands) {
      if (!island.hasAttribute("ssr")) continue;
      // An island is display: contents, so it has no box to scroll to;
      // client:visible observes its children, so bring the first into view.
      (island.firstElementChild ?? island).scrollIntoView({ block: "center" });
      while (island.hasAttribute("ssr") && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    }
    window.scrollTo(0, 0);
    return islands.filter((island) => island.hasAttribute("ssr")).map((island) => island.getAttribute("component-url"));
  });
  if (pending.length) throw new Error(`islands never hydrated: ${pending.join(", ")}`);
  // Effects (listeners added in useEffect) run after the attribute drops.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function load(slug) {
  await page.goto(`${base}/components/${slug}/`, { waitUntil: "load" });
  await waitForHydration();
  await page.waitForTimeout(150); // entrance animations
  await page.addScriptTag({ content: bundle });
}

// A playground's component is fully controlled by the panel beside it (a
// `checked` control with a no-op handler), so clicking it rightly changes
// nothing; those toggle checks are only meaningful in the examples.
const PLAYGROUND_IGNORE = ["switch/toggles", "checkbox/toggles", "toggle-button/toggles"];
const checkRegions = () =>
  page.evaluate(async (playgroundIgnore) => {
    const results = [];
    for (const region of document.querySelectorAll(".docs-example, .prop-playground-stage")) {
      const playground = region.matches(".prop-playground-stage");
      const result = await window.KernelTesting.checkPage(region, playground ? { ignore: playgroundIgnore } : {});
      results.push({ ...result, label: playground ? "playground" : "example" });
    }
    return results;
  }, PLAYGROUND_IGNORE);

for (engine of engines) {
  let browser;
  try {
    browser = await launch(engine);
  } catch (error) {
    const reason = String(error.message).split("\n")[0];
    record("(browser)", `launch ${engine}`, { issues: [{ rule: "browser/launch", severity: "error", message: `${engine} didn't launch (${reason}). Install it with \`bunx playwright install ${engine}\`.` }], passes: [], skipped: [] });
    continue;
  }
  page = await browser.newPage();
  for (const slug of targets) await checkSlug(slug);
  await browser.close();
}
server.close();

async function checkSlug(slug) {
  await load(slug);
  const results = await checkRegions();
  results.forEach((result, index) => record(slug, `${result.label} ${index + 1}`, result));

  // Real, trusted key presses for behaviour synthetic events can't reach.
  if (slug === "dialog") {
    await load(slug);
    const trigger = page.locator(".docs-example button").first();
    // Open from the keyboard: WebKit doesn't focus a button on click (as in
    // Safari), so a clicked trigger was never focused and there's nothing
    // for focus to return to. Keyboard users are who focus return is for.
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForSelector("dialog[open]");
    await page.waitForTimeout(300);
    record(slug, "open dialog", await page.evaluate(() => window.KernelTesting.checkComponent(document.querySelector("dialog[open]").parentElement, "Dialog")));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const closed = await page.evaluate(() => !document.querySelector("dialog[open]"));
    const refocused = await trigger.evaluate((el) => el === document.activeElement || el.contains(document.activeElement));
    if (closed && refocused) pass(slug, "Escape closes, focus returns (real keys)");
    else fail(slug, "Escape closes, focus returns (real keys)", `closed: ${closed}, focus back on trigger: ${refocused}`);
  }

  if (slug === "dropdown-menu") {
    await load(slug);
    const trigger = page.locator('.docs-example [aria-haspopup="menu"]').first();
    // load() waited for the island to hydrate: popovertarget opens the menu
    // natively before that, but focusing the first item is React's job.
    await trigger.focus();
    await page.keyboard.press("Enter");
    await page.waitForTimeout(300);
    const state = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]:popover-open');
      return { open: Boolean(menu), focusInMenu: Boolean(menu?.contains(document.activeElement)) };
    });
    await page.keyboard.press("ArrowDown");
    const moved = await page.evaluate(() => document.activeElement?.getAttribute("role") === "menuitem");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => !document.querySelector('[role="menu"]:popover-open'));
    const refocused = await trigger.evaluate((el) => el === document.activeElement);
    const ok = state.open && state.focusInMenu && moved && after && refocused;
    if (ok) pass(slug, "Enter opens, arrows move, Escape closes and refocuses (real keys)");
    else fail(slug, "Enter opens, arrows move, Escape closes and refocuses (real keys)", JSON.stringify({ ...state, moved, closed: after, refocused }));
  }

  if (slug === "context-menu") {
    await load(slug);
    const area = page.locator(".docs-example").first().locator("div").first();
    await area.click({ button: "right" });
    await page.waitForTimeout(300);
    // A pointer open focuses the menu container itself, with no item
    // highlighted (utils/menuFocus.ts); the first ArrowDown lands on item 0.
    const focusInMenu = await page.evaluate(() => {
      const menu = document.querySelector('[role="menu"]:popover-open');
      return Boolean(menu?.contains(document.activeElement)) && document.activeElement?.getAttribute("role") !== "menuitem";
    });
    await page.keyboard.press("ArrowDown");
    const first = await page.evaluate(() => {
      const items = [...document.querySelectorAll('[role="menu"]:popover-open [role="menuitem"]')];
      return items.indexOf(document.activeElement);
    });
    record(slug, "open menu", await page.evaluate(() => window.KernelTesting.checkPattern(document.querySelector('[role="menu"]:popover-open') ?? document.body, "menu")));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(300);
    const closed = await page.evaluate(() => !document.querySelector('[role="menu"]:popover-open'));
    if (focusInMenu && first === 0 && closed) pass(slug, "right-click focuses the menu, arrows move, Escape closes (real keys)");
    else fail(slug, "right-click focuses the menu, arrows move, Escape closes (real keys)", JSON.stringify({ focusInMenu, focusedIndexAfterArrowDown: first, closed }));
  }

  if (slug === "tooltip") {
    await load(slug);
    const trigger = page.locator(".docs-example [aria-describedby]").first();
    await trigger.focus();
    await page.waitForTimeout(500);
    const shown = await page.evaluate(() => Boolean(document.querySelector('[role="tooltip"]:popover-open')));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const hidden = await page.evaluate(() => !document.querySelector('[role="tooltip"]:popover-open'));
    if (shown && hidden) pass(slug, "focus shows, Escape hides (real keys)");
    else fail(slug, "focus shows, Escape hides (real keys)", JSON.stringify({ shown, hidden }));
  }

  if (slug === "hover-card") {
    await load(slug);
    const trigger = page.locator(".docs-example [aria-describedby]").first();
    await trigger.focus();
    await page.waitForTimeout(500);
    const shown = await page.evaluate(() => Boolean(document.querySelector('[data-slot="hover-card-content"]:popover-open')));
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    const hidden = await page.evaluate(() => !document.querySelector('[data-slot="hover-card-content"]:popover-open'));
    const focusKept = await trigger.evaluate((el) => el === document.activeElement);
    if (shown && hidden && focusKept) pass(slug, "focus shows, Escape hides, focus stays (real keys)");
    else fail(slug, "focus shows, Escape hides, focus stays (real keys)", JSON.stringify({ shown, hidden, focusKept }));
  }
}

let errorCount = 0;
for (const entry of report) {
  errorCount += entry.errors.length;
  const status = entry.errors.length ? "✗" : "✓";
  const found = entry.found && Object.keys(entry.found).length ? ` [${Object.entries(entry.found).map(([k, v]) => `${k}×${v}`).join(", ")}]` : "";
  console.log(`${status} ${engines.length > 1 ? `[${entry.engine}] ` : ""}${entry.slug} — ${entry.label}${found}: ${entry.passes} passed, ${entry.errors.length} error(s), ${entry.warnings.length} warning(s), ${entry.skipped.length} skipped`);
  for (const issue of entry.errors) console.log(`    ✗ [${issue.rule}] ${issue.message}${issue.target ? `\n        at ${issue.target}` : ""}`);
  if (verbose) {
    for (const issue of entry.warnings) console.log(`    ! [${issue.rule}] ${issue.message}${issue.target ? `\n        at ${issue.target}` : ""}`);
    for (const skip of entry.skipped) console.log(`    - [${skip.rule}] ${skip.kind}: ${skip.reason}`);
  }
}
if (errorCount) {
  console.error(`\ncheck-patterns: ${errorCount} error(s).`);
  process.exit(1);
}
console.log(`\ncheck-patterns: ${report.length} checks across ${targets.length} pages in ${engines.join(", ")}, no errors.`);
