#!/usr/bin/env node
/**
 * Visual screenshot suite for every component's live docs examples.
 *
 * Serves the built docs site (apps/docs/dist) on a local static server, opens
 * each available component page in Playwright, and screenshots every live
 * example region (`.docs-example` and `.prop-playground-stage`) under a set of
 * theme variants: colour scheme, radius preset, text direction, and a
 * "low-sitting" font whose metrics push text down in its line box. The last
 * one exists to catch the optical-centring work in Badge, Button and the
 * other pills regressing: a component that centres by the line box instead of
 * by the cap height shows up as text visibly sunk in its box.
 *
 * Modes:
 *   node scripts/screenshot-suite.mjs                 capture into screenshots/current,
 *                                                     then compare with screenshots/baseline
 *                                                     if one exists
 *   node scripts/screenshot-suite.mjs --update        capture into screenshots/baseline
 *   node scripts/screenshot-suite.mjs --compare-only  skip capture, diff what's on disk
 *
 * Options:
 *   badge button ...            only these slugs (positional, like check-a11y)
 *   --variants=a,b              variant names (default: the DEFAULT_VARIANTS list)
 *   --variants=all              every variant defined below
 *   --list-variants             print the variant names and exit
 *   --threshold=0.1             pixelmatch per-pixel colour threshold (0–1)
 *   --max-diff-ratio=0.001      fail a shot when more than this fraction of pixels differ
 *   --strict                    also fail on shots that have no baseline
 *   --cpu-throttle=4            slow each page's CPU by this factor (Chromium only), to
 *                               check the capture stays deterministic on a slow machine
 *
 * Output (all gitignored): screenshots/current/<slug>/<variant>-<n>.png,
 * screenshots/baseline/... in --update mode, and screenshots/report/
 * (diff PNGs plus index.html with baseline / current / diff side by side).
 *
 * Baselines are not committed: font rasterisation differs between macOS,
 * Linux and Windows, so a baseline only means something on the machine (or
 * CI image) that produced it. Make one locally with --update before a
 * change, then run without it after. CI keeps its own baseline from main
 * (see .github/workflows/screenshots.yml).
 *
 * Needs a docs build first (`bun run docs:build`) and a Chromium for
 * Playwright: in CI `bunx playwright install chromium`; locally it falls back
 * to installed Chrome.
 */
import { createReadStream, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, join, relative } from "node:path";
import { chromium } from "playwright";
import pixelmatch from "pixelmatch";
import { PNG } from "pngjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "apps/docs/dist");
const outRoot = join(root, "screenshots");
const dirs = {
  current: join(outRoot, "current"),
  baseline: join(outRoot, "baseline"),
  report: join(outRoot, "report"),
};

// Radius presets, copied from apps/docs/src/lib/theme.ts (RADII). The docs
// site's inline head script reads these localStorage keys before first paint,
// so seeding them gives exactly the state the theme switcher would leave.
const RADII = {
  sharp: { "kernel:radius": "0px", "kernel:radius-container": "0px", "kernel:radius-sheet": "0px" },
  soft: { "kernel:radius": "0.5rem" },
  round: { "kernel:radius": "1.25rem", "kernel:radius-control": "var(--kernel-radius-full)" },
};

/**
 * The low-sitting font: the repo's own KK Sans (so the glyphs are identical
 * on every machine), loaded under a new family name with its vertical metrics
 * overridden. A large ascent and a small descent move the baseline down in
 * the line box, which is what lopsided real-world fonts do (several system
 * and CJK fonts reserve tall ascents for diacritics). Anything centred by
 * its line box rather than by the `::before` baseline strut sits visibly low.
 */
const LOW_FONT_FILE = join(root, "apps/docs/src/assets/fonts/source/KKSansVF.woff2");
const LOW_FONT_PATH = "/__screenshot-suite/low-sitting.woff2";
const LOW_FONT_CSS = `
@font-face {
  font-family: "Kernel Screenshot Low";
  src: url("${LOW_FONT_PATH}") format("woff2");
  font-weight: 100 900;
  ascent-override: 125%;
  descent-override: 5%;
  line-gap-override: 0%;
}
:root { --kernel-font-sans: "Kernel Screenshot Low", system-ui, sans-serif !important; }
`;

/** Each variant is one point in the theme matrix. */
const VARIANTS = {
  "light-sharp": { scheme: "light", radius: "sharp" },
  "light-round": { scheme: "light", radius: "round" },
  "dark-round": { scheme: "dark", radius: "round" },
  "rtl-light": { scheme: "light", radius: "round", dir: "rtl" },
  "lowfont-light": { scheme: "light", radius: "round", lowFont: true },
  // Off by default; opt in with --variants.
  "dark-sharp": { scheme: "dark", radius: "sharp" },
  "light-soft": { scheme: "light", radius: "soft" },
  "rtl-dark": { scheme: "dark", radius: "round", dir: "rtl" },
  "lowfont-sharp": { scheme: "light", radius: "sharp", lowFont: true },
  "lowfont-dark": { scheme: "dark", radius: "round", lowFont: true },
};
const DEFAULT_VARIANTS = ["light-sharp", "light-round", "dark-round", "rtl-light", "lowfont-light"];

/**
 * Time. Several demos move on their own: StreamingMarkdown and SchemaRenderer
 * stream on an interval, ToolCall and Reasoning step through states on
 * timeouts, CodeBlock, FileDiff, Progress and TodoList loop, DatePicker marks
 * today and Footer prints the year. Captured on the real clock, each shot is
 * whatever frame happened to be on screen when the screenshot fired, which
 * moves with machine load and hydration order.
 *
 * So every page runs on Playwright's fake clock, paused at FIXED_TIME before
 * the document loads: `Date`, `performance.now`, `setTimeout`,
 * `setInterval` and `requestAnimationFrame` only move when the suite moves
 * them. Once every island has hydrated (at fake time zero for all of them),
 * the clock runs forward SETTLE_MS in SETTLE_STEP_MS steps. Between steps the
 * suite lets network work (FileUpload's fixture files) finish and the browser
 * render real frames (see renderFrames), so every run sees the same order of
 * timers, scroll events and resize callbacks. SETTLE_MS is long
 * enough for every one-shot demo to finish (the longest, Reasoning, needs
 * 3.2s); looping demos land on the same frame every run because the elapsed
 * time is identical. The shots therefore show settled UI: finished streams,
 * completed tool calls, the loops at a fixed point in their cycle.
 *
 * Each page gets a fresh browser context, so every page starts at the same
 * FIXED_TIME (the clock's log replays into each new document, and runs would
 * otherwise accumulate across pages) and no state leaks between components.
 */
const FIXED_TIME = new Date("2025-06-16T10:00:00Z");
const SETTLE_MS = 10_000;
const SETTLE_STEP_MS = 250;
/** One extra short run after settling, for rAF-driven measurement queued by the last tick. */
const SETTLE_TAIL_MS = 100;

// Seeded Math.random (mulberry32), installed before any page script runs, so
// shuffles and generated ids are the same every run.
const SEED_RANDOM = `(() => {
  let a = 0x6b65726e;
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();`;

// Determinism: no motion, no blinking caret, no scrollbars changing width.
// `::-webkit-progress-value` isn't matched by `*`, so Progress's fill would
// still slide to its new width.
const FREEZE_CSS = `
*, *::before, *::after, ::-webkit-progress-value {
  transition: none !important;
  animation: none !important;
  caret-color: transparent !important;
}
* { scroll-behavior: auto !important; }
html { scrollbar-width: none; }
`;

// Smooth scrolling is motion too, and the compositor runs it on the real
// clock: MessageScroller's stick-to-bottom calls scrollTo({ behavior:
// "smooth" }) and would be captured part-way down. Make every scroll instant.
const INSTANT_SCROLL = `(() => {
  const instant = (options) =>
    options && typeof options === "object" && options.behavior === "smooth" ? { ...options, behavior: "instant" } : options;
  for (const target of [Element.prototype, window]) {
    for (const method of ["scroll", "scrollTo", "scrollBy"]) {
      const original = target[method];
      if (typeof original !== "function") continue;
      target[method] = function (options, ...rest) {
        return original.call(this, instant(options), ...rest);
      };
    }
  }
  const scrollIntoView = Element.prototype.scrollIntoView;
  Element.prototype.scrollIntoView = function (options) {
    return scrollIntoView.call(this, instant(options));
  };
})();`;

// ---------------------------------------------------------------------------
// CLI

const args = process.argv.slice(2);
const flags = new Map();
const only = [];
for (const arg of args) {
  if (arg.startsWith("--")) {
    const [key, value = "true"] = arg.slice(2).split("=");
    flags.set(key, value);
  } else only.push(arg);
}
if (flags.has("list-variants")) {
  for (const [name, v] of Object.entries(VARIANTS)) {
    console.log(`${DEFAULT_VARIANTS.includes(name) ? "*" : " "} ${name.padEnd(14)} ${JSON.stringify(v)}`);
  }
  console.log("\n* = default");
  process.exit(0);
}
const update = flags.has("update");
const compareOnly = flags.has("compare-only");
const strict = flags.has("strict");
const cpuThrottle = Number(flags.get("cpu-throttle") ?? 1);
const threshold = Number(flags.get("threshold") ?? 0.1);
const maxDiffRatio = Number(flags.get("max-diff-ratio") ?? 0.001);
const variantNames = (() => {
  const raw = flags.get("variants");
  if (!raw) return DEFAULT_VARIANTS;
  if (raw === "all") return Object.keys(VARIANTS);
  const names = raw.split(",").map((s) => s.trim()).filter(Boolean);
  const unknown = names.filter((n) => !VARIANTS[n]);
  if (unknown.length) {
    console.error(`screenshot-suite: unknown variant(s) ${unknown.join(", ")}. Try --list-variants.`);
    process.exit(1);
  }
  return names;
})();

// ---------------------------------------------------------------------------
// Capture

/** Real (Node) time; the page's timers are fake and never fire on their own. */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Lets the page drain the tasks already queued: React schedules renders and
 * effects on a MessageChannel, which the fake clock doesn't touch, so a
 * message posted now arrives after them.
 */
async function flushTasks(page, rounds = 3) {
  for (let i = 0; i < rounds; i++) {
    await page.evaluate(
      () =>
        new Promise((resolve) => {
          const channel = new MessageChannel();
          channel.port1.onmessage = () => resolve();
          channel.port2.postMessage(0);
        }),
    );
  }
}

/** Counts in-flight requests so the suite can wait for fetches a demo starts on its own. */
function trackNetwork(page) {
  const inflight = new Set();
  page.on("request", (request) => inflight.add(request));
  page.on("requestfinished", (request) => inflight.delete(request));
  page.on("requestfailed", (request) => inflight.delete(request));
  return {
    async quiet(timeout = 15_000) {
      const deadline = Date.now() + timeout;
      for (;;) {
        await flushTasks(page);
        if (inflight.size === 0) return;
        if (Date.now() > deadline) throw new Error(`requests never finished: ${[...inflight].map((r) => r.url()).join(", ")}`);
        await sleep(20);
      }
    },
  };
}

/**
 * Waits for the examples' islands to hydrate instead of guessing a delay
 * (the same approach as scripts/check-patterns.mjs): Astro removes an
 * <astro-island>'s `ssr` attribute once its component has hydrated, and
 * `client:visible` islands only hydrate once scrolled into view. Hydrating
 * every island up front, before any fake time passes, means each demo's
 * timers start from the same instant whatever order the islands woke in.
 * Polled from Node, because the page's own timers are paused.
 */
async function waitForHydration(page, slug, timeout = 15_000) {
  const deadline = Date.now() + timeout;
  const pendingIslands = () =>
    page.evaluate(() => {
      const regions = Array.from(document.querySelectorAll(".docs-example, .prop-playground-stage"));
      const islands = Array.from(document.querySelectorAll("astro-island[ssr]")).filter((island) =>
        regions.some((region) => region.contains(island) || island.contains(region)),
      );
      // An island is display: contents, so it has no box to scroll to;
      // client:visible observes its children, so bring the first into view.
      const next = islands[0];
      if (next) (next.firstElementChild ?? next).scrollIntoView({ block: "center" });
      return islands.map((island) => island.getAttribute("component-url"));
    });
  let pending = await pendingIslands();
  while (pending.length && Date.now() < deadline) {
    await sleep(20);
    pending = await pendingIslands();
  }
  if (pending.length) throw new Error(`screenshot-suite: ${slug}: islands never hydrated: ${pending.join(", ")}`);
  await page.evaluate(() => window.scrollTo(0, 0));
  // Effects (and the fetches they start) run after the attribute drops.
  await flushTasks(page);
}

/**
 * Waits for the browser to render real frames. Scroll events and
 * ResizeObserver callbacks are delivered by the rendering loop, not by
 * timers, so without a frame between clock steps they'd land at whatever
 * point in the fake timeline the compositor happened to reach: that's how
 * MessageScroller's stick-to-bottom read its own scroll as the reader's and
 * unpinned on some runs. Two frames: scroll events and rAF run in the first,
 * ResizeObserver callbacks after its layout; then drain what they queued.
 * Uses the native rAF the fake clock keeps aside, or a real-time sleep if
 * Playwright ever stops exposing it.
 */
async function renderFrames(page) {
  await page.evaluate(async () => {
    const raf = globalThis.__pwClock?.builtins?.requestAnimationFrame;
    const frame = raf ? () => new Promise((resolve) => raf(() => resolve())) : null;
    if (frame) {
      await frame();
      await frame();
    }
    return Boolean(frame);
  }).then((rendered) => (rendered ? undefined : sleep(40)));
  await flushTasks(page);
}

/** Runs the fake clock forward to the settled point, then waits for images. */
async function settle(page, network) {
  const step = async (ms) => {
    await network.quiet();
    await page.clock.runFor(ms);
    await network.quiet();
    await renderFrames(page);
  };
  for (let elapsed = 0; elapsed < SETTLE_MS; elapsed += SETTLE_STEP_MS) await step(SETTLE_STEP_MS);
  await step(SETTLE_TAIL_MS);
  // Lazy images below the fold would otherwise start loading when the
  // screenshot scrolls to them. Decode everything first.
  await Promise.race([
    page.evaluate(async () => {
      const images = Array.from(document.querySelectorAll(".docs-example img, .prop-playground-stage img"));
      for (const img of images) if (img.loading === "lazy") img.loading = "eager";
      await Promise.all(images.map((img) => img.decode().catch(() => {})));
      await document.fonts.ready;
    }),
    sleep(10_000),
  ]);
  await network.quiet();
}

async function capture(targetDir) {
  if (!existsSync(dist)) {
    console.error("screenshot-suite: apps/docs/dist not found. Run `bun run docs:build` first.");
    process.exit(1);
  }
  const registry = JSON.parse(readFileSync(join(root, "apps/docs/public/registry.json"), "utf8"));
  const slugs = registry.components
    .filter((c) => c.status === "available")
    .map((c) => c.slug)
    .filter((slug) => only.length === 0 || only.includes(slug));
  if (slugs.length === 0) {
    console.error(`screenshot-suite: no available components match ${only.join(", ")}.`);
    process.exit(1);
  }

  const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon", ".txt": "text/plain", ".md": "text/markdown" };
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = path === LOW_FONT_PATH ? LOW_FONT_FILE : join(dist, path);
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

  // Clear only the slugs being re-captured, so a filtered run doesn't wipe
  // the rest of the set.
  for (const slug of slugs) rmSync(join(targetDir, slug), { recursive: true, force: true });

  let shots = 0;
  const started = Date.now();
  // Variants run concurrently, each working through the slugs in order with
  // a fresh context per page: the time per page is mostly waiting (network,
  // fonts, hydration), not CPU.
  const newContext = async (variant) => {
    const context = await browser.newContext({
      colorScheme: variant.scheme,
      viewport: { width: 1280, height: 900 },
      deviceScaleFactor: 1,
      locale: "en-US",
      timezoneId: "UTC",
    });
    // Paused before the first document exists, so no page timer ever runs
    // on the real clock.
    await context.clock.install({ time: FIXED_TIME });
    await context.clock.pauseAt(FIXED_TIME);
    await context.addInitScript(SEED_RANDOM);
    await context.addInitScript(INSTANT_SCROLL);
    await context.addInitScript(
      ({ storage, dir }) => {
        try {
          localStorage.clear();
          for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, value);
        } catch {}
        if (dir) {
          // Set `dir` before any island hydrates, so components that read
          // direction at mount see RTL. The <html> element may not exist yet
          // when init scripts run.
          const apply = () => {
            if (!document.documentElement) return false;
            document.documentElement.setAttribute("dir", dir);
            return true;
          };
          if (!apply()) {
            const observer = new MutationObserver(() => apply() && observer.disconnect());
            observer.observe(document, { childList: true });
          }
        }
      },
      { storage: { ...RADII[variant.radius], "kernel:color-scheme": variant.scheme }, dir: variant.dir ?? null },
    );
    return context;
  };

  const runVariant = async (name) => {
    const variant = VARIANTS[name];
    for (const slug of slugs) {
      const context = await newContext(variant);
      try {
        const page = await context.newPage();
        const network = trackNetwork(page);
        if (cpuThrottle > 1) {
          const cdp = await context.newCDPSession(page);
          await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpuThrottle });
        }
        await page.goto(`${base}/components/${slug}/`, { waitUntil: "load" });
        await page.addStyleTag({ content: FREEZE_CSS + (variant.lowFont ? LOW_FONT_CSS : "") });
        if (variant.dir) await page.evaluate((dir) => document.documentElement.setAttribute("dir", dir), variant.dir);
        await network.quiet();
        await page.evaluate(async () => { await document.fonts.ready; });
        await waitForHydration(page, slug);
        await settle(page, network);
        const regions = page.locator(".docs-example, .prop-playground-stage");
        const count = await regions.count();
        if (count === 0) continue;
        mkdirSync(join(targetDir, slug), { recursive: true });
        for (let i = 0; i < count; i++) {
          const region = regions.nth(i);
          if (!(await region.isVisible())) continue;
          await region.screenshot({
            path: join(targetDir, slug, `${name}-${i + 1}.png`),
            animations: "disabled",
            caret: "hide",
          });
          shots++;
        }
      } finally {
        await context.close();
      }
    }
    console.log(`  ${name}: done`);
  };
  await Promise.all(variantNames.map(runVariant));
  await browser.close();
  server.close();
  console.log(`screenshot-suite: ${shots} screenshot(s) of ${slugs.length} component(s) × ${variantNames.length} variant(s) in ${((Date.now() - started) / 1000).toFixed(1)}s → ${relative(root, targetDir)}/`);
}

// ---------------------------------------------------------------------------
// Compare

function listPngs(dir) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true, recursive: true })) {
    if (entry.isFile() && entry.name.endsWith(".png")) out.push(relative(dir, join(entry.parentPath ?? entry.path, entry.name)));
  }
  return out.sort();
}

function inScope(file) {
  const [slug, name] = file.split("/");
  const variant = name.replace(/-\d+\.png$/, "");
  return (only.length === 0 || only.includes(slug)) && variantNames.includes(variant);
}

function compare() {
  if (!existsSync(dirs.baseline)) {
    console.log("screenshot-suite: no screenshots/baseline yet, nothing to compare. Run with --update to create one.");
    return true;
  }
  const current = listPngs(dirs.current).filter(inScope);
  const baseline = listPngs(dirs.baseline).filter(inScope);
  rmSync(dirs.report, { recursive: true, force: true });
  mkdirSync(dirs.report, { recursive: true });

  const rows = [];
  for (const file of new Set([...current, ...baseline])) {
    const a = join(dirs.baseline, file);
    const b = join(dirs.current, file);
    if (!existsSync(a)) {
      rows.push({ file, status: "new" });
      continue;
    }
    if (!existsSync(b)) {
      rows.push({ file, status: "missing" });
      continue;
    }
    const imgA = PNG.sync.read(readFileSync(a));
    const imgB = PNG.sync.read(readFileSync(b));
    if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
      rows.push({ file, status: "size", detail: `${imgA.width}×${imgA.height} → ${imgB.width}×${imgB.height}` });
      continue;
    }
    const diff = new PNG({ width: imgA.width, height: imgA.height });
    const pixels = pixelmatch(imgA.data, imgB.data, diff.data, imgA.width, imgA.height, { threshold });
    const ratio = pixels / (imgA.width * imgA.height);
    if (ratio > maxDiffRatio) {
      const diffPath = join(dirs.report, "diff", file);
      mkdirSync(dirname(diffPath), { recursive: true });
      writeFileSync(diffPath, PNG.sync.write(diff));
      rows.push({ file, status: "diff", detail: `${pixels} px (${(ratio * 100).toFixed(3)}%)` });
    } else rows.push({ file, status: "same" });
  }

  const failing = rows.filter((r) => r.status === "diff" || r.status === "size" || (strict && r.status === "new"));
  const notable = rows.filter((r) => r.status !== "same");
  writeReport(notable, rows.length);

  for (const r of notable) console.log(`  ${r.status.padEnd(7)} ${r.file}${r.detail ? `  ${r.detail}` : ""}`);
  const summary = ["same", "diff", "size", "new", "missing"].map((s) => `${rows.filter((r) => r.status === s).length} ${s}`).join(", ");
  console.log(`screenshot-suite: compared ${rows.length} shot(s): ${summary}. Report: ${relative(root, join(dirs.report, "index.html"))}`);
  if (failing.length) {
    console.error(`screenshot-suite: ${failing.length} shot(s) differ from the baseline by more than ${(maxDiffRatio * 100).toFixed(2)}% of pixels.`);
    return false;
  }
  return true;
}

function writeReport(rows, total) {
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const img = (dir, file) => (existsSync(join(dir, file)) ? `<img src="${esc(relative(dirs.report, join(dir, file)))}" alt="">` : "<span>none</span>");
  const body = rows.length
    ? rows
        .map(
          (r) => `<section class="${r.status}">
  <h2>${esc(r.file)} <small>${r.status}${r.detail ? ` · ${esc(r.detail)}` : ""}</small></h2>
  <div class="grid">
    <figure><figcaption>Baseline</figcaption>${img(dirs.baseline, r.file)}</figure>
    <figure><figcaption>Current</figcaption>${img(dirs.current, r.file)}</figure>
    <figure><figcaption>Diff</figcaption>${img(join(dirs.report, "diff"), r.file)}</figure>
  </div>
</section>`,
        )
        .join("\n")
    : "<p>No differences.</p>";
  writeFileSync(
    join(dirs.report, "index.html"),
    `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Screenshot diff</title>
<style>
  :root { color-scheme: light dark; font-family: system-ui, sans-serif; }
  body { margin: 0 auto; max-width: 1600px; padding: 16px; }
  h1 { font-size: 1.25rem; } h2 { font-size: 0.95rem; font-weight: 600; margin: 0 0 8px; }
  small { font-weight: 400; opacity: 0.7; }
  section { border-top: 1px solid #8884; padding: 16px 0; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px; }
  figure { margin: 0; } figcaption { font-size: 0.8rem; opacity: 0.7; margin-bottom: 4px; }
  img { max-width: 100%; height: auto; border: 1px solid #8884; background: repeating-conic-gradient(#8882 0 25%, transparent 0 50%) 0 0 / 16px 16px; }
  .diff h2, .size h2 { color: #c0392b; }
</style></head><body>
<h1>Screenshot diff</h1>
<p>${rows.length} of ${total} shot(s) changed, new or missing.</p>
${body}
</body></html>
`,
  );
}

// ---------------------------------------------------------------------------

if (!compareOnly) await capture(update ? dirs.baseline : dirs.current);
if (!update && !compare()) process.exit(1);
