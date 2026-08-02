/**
 * Frame-by-frame check for the `<details>` disclosure motion.
 *
 * A one-frame full-height flash is invisible in a screenshot and easy to miss
 * by eye, so this samples the animated panel's box on every animation frame
 * and fails on the shapes that read as broken: a frame taller than the settled
 * height (flash), a non-monotonic run (stutter/snap-back), or a transition
 * that only ever produced its start and end values (no animation at all).
 *
 * Runs against an isolated fixture built from the packages' own `dist/`, not
 * the docs site — docs demos stream, re-render and hydrate lazily, none of
 * which this is trying to measure.
 *
 * Usage: node scripts/disclosure-motion-check.mjs [--headed]
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { chromium, firefox, webkit } from "playwright";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

const css = [
  read("packages/styles/src/tokens.css"),
  read("packages/styles/src/reset.css"),
  read("packages/elements/dist/kernel.css"),
].join("\n");
const elementsJs = read("packages/elements/dist/index.js");

const BODY = `
<main style="padding:40px;max-width:640px">
  <kernel-accordion type="multiple">
    <kernel-accordion-item title="First">
      <p>Line one of the panel body.</p>
      <p>Line two, so the panel has a real height to travel.</p>
    </kernel-accordion-item>
    <kernel-accordion-item title="Second">
      <p>Another panel.</p>
    </kernel-accordion-item>
  </kernel-accordion>

  <kernel-reasoning duration-label="Thought for 4s">
    <p>Reasoning body paragraph one.</p>
    <p>Reasoning body paragraph two.</p>
  </kernel-reasoning>

  <kernel-tool-call name="search" status="success">
    <p>Tool call output line one.</p>
    <p>Tool call output line two.</p>
  </kernel-tool-call>
</main>`;

const CASES = [
  { name: "Accordion item", selector: "details.kernel-Accordion-item" },
  { name: "Reasoning", selector: "details.kernel-Reasoning-root" },
  { name: "ToolCall", selector: "details.kernel-ToolCall-root" },
];

function analyse(samples, expectOpen) {
  // The `<details>` box is the honest signal. The inner panel's own rect lies
  // while closed: `content-visibility: hidden` retains the subtree's geometry.
  const heights = samples.map((s) => s.detailsHeight);
  if (heights.length < 4) return { ok: false, reason: `only ${heights.length} frames` };

  const settled = expectOpen ? heights[heights.length - 1] : heights[0];
  const peak = Math.max(...heights);
  const problems = [];

  // A flash is a frame meaningfully taller than where the panel settles.
  if (peak > settled + 1) {
    const at = heights.findIndex((h) => h > settled + 1);
    problems.push(
      `overshoot to ${peak.toFixed(1)}px at frame ${at} (settles ${settled.toFixed(1)}px)`,
    );
  }

  // Direction reversals mid-run mean it jumped rather than eased.
  let reversals = 0;
  for (let i = 2; i < heights.length; i += 1) {
    const prev = heights[i - 1] - heights[i - 2];
    const curr = heights[i] - heights[i - 1];
    if (Math.abs(prev) > 0.5 && Math.abs(curr) > 0.5 && Math.sign(prev) !== Math.sign(curr)) {
      reversals += 1;
    }
  }
  if (reversals > 1) problems.push(`${reversals} direction reversals`);

  const distinct = new Set(heights.map((h) => Math.round(h))).size;
  if (distinct < 4) problems.push(`only ${distinct} distinct heights (snap, not animation)`);

  // The end state has to actually match what was asked for.
  const last = samples[samples.length - 1];
  if (last.open !== expectOpen) problems.push(`ended open=${last.open}`);
  if (last.panelVisible !== expectOpen) problems.push(`panel visible=${last.panelVisible}`);
  if (last.inlineHeight) problems.push(`left inline height "${last.inlineHeight}"`);
  if (last.state) problems.push(`left data-state="${last.state}"`);

  return {
    ok: problems.length === 0,
    reason: problems.join("; "),
    frames: heights.length,
    distinct,
    peak: peak.toFixed(1),
  };
}

const sampler = () => {
  window.__samples = [];
  const tick = () => {
    const d = window.__d;
    const c = window.__c;
    window.__samples.push({
      detailsHeight: d.getBoundingClientRect().height,
      open: d.open,
      state: d.getAttribute("data-state"),
      inlineHeight: c.style.height,
      panelVisible: c.checkVisibility(),
    });
    window.__raf = requestAnimationFrame(tick);
  };
  window.__raf = requestAnimationFrame(tick);
};

const stop = () => {
  cancelAnimationFrame(window.__raf);
  return window.__samples;
};

async function record(page, action, settleMs = 700) {
  await page.evaluate(sampler);
  await page.evaluate(action);
  await page.waitForTimeout(settleMs);
  return page.evaluate(stop);
}

/** `prefers-reduced-motion` must snap instantly and leave no inline styles. */
async function checkReducedMotion(engine, name) {
  const browser = await engine.launch();
  const page = await browser.newPage({
    viewport: { width: 900, height: 800 },
    reducedMotion: "reduce",
  });
  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${BODY}</body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: elementsJs, type: "module" });
  await page.waitForFunction(() => !!customElements.get("kernel-accordion-item"));
  await page.waitForTimeout(200);

  const verdict = await page.evaluate(async () => {
    const d = document.querySelector("details.kernel-Accordion-item");
    const c = d.querySelector(":scope > *:not(summary)");
    if (d.open) d.open = false;
    await new Promise((r) => setTimeout(r, 100));
    d.querySelector("summary").click();
    await new Promise((r) => requestAnimationFrame(r));
    const openedImmediately = d.open && c.getBoundingClientRect().height > 0;
    const running = c.getAnimations().length;
    const inline = c.style.height;
    return { openedImmediately, running, inline, state: d.getAttribute("data-state") };
  });
  await browser.close();

  const problems = [];
  if (!verdict.openedImmediately) problems.push("did not open on the first frame");
  if (verdict.running) problems.push(`${verdict.running} animation(s) still running`);
  if (verdict.inline) problems.push(`left inline height "${verdict.inline}"`);
  if (verdict.state) problems.push(`left data-state="${verdict.state}"`);
  return {
    label: `${name} · reduced motion · snaps`,
    ok: problems.length === 0,
    reason: problems.join("; "),
  };
}

async function runBrowser(engine, name, headed) {
  const browser = await engine.launch({ headless: !headed });
  const page = await browser.newPage({ viewport: { width: 900, height: 800 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.setContent(`<!doctype html><html><head><meta charset="utf-8"></head><body>${BODY}</body></html>`);
  await page.addStyleTag({ content: css });
  await page.addScriptTag({ content: elementsJs, type: "module" });
  await page.waitForFunction(() => !!customElements.get("kernel-accordion-item"));
  await page.waitForTimeout(200);

  const results = [];
  for (const testCase of CASES) {
    const ready = await page.evaluate((selector) => {
      const d = document.querySelector(selector);
      if (!d) return false;
      window.__d = d;
      window.__c = d.querySelector(":scope > *:not(summary)");
      if (d.open) d.open = false;
      return !!window.__c;
    }, testCase.selector);

    if (!ready) {
      results.push({ label: `${name} · ${testCase.name}`, ok: false, reason: "target not found" });
      continue;
    }
    await page.waitForTimeout(250);

    const click = () => window.__d.querySelector("summary").click();

    results.push({
      label: `${name} · ${testCase.name} · open`,
      ...analyse(await record(page, click), true),
    });
    results.push({
      label: `${name} · ${testCase.name} · close`,
      ...analyse(await record(page, click), false),
    });

    // Reverse mid-flight: it must land closed, without exceeding the height
    // it had already reached when interrupted.
    await page.evaluate(sampler);
    await page.evaluate(click);
    await page.waitForTimeout(70);
    await page.evaluate(click);
    await page.waitForTimeout(700);
    const interrupted = await page.evaluate(stop);
    const last = interrupted[interrupted.length - 1];
    const baseline = interrupted[0].detailsHeight;
    const okInterrupt =
      !last.open && !last.state && !last.inlineHeight && last.detailsHeight <= baseline + 1;
    results.push({
      label: `${name} · ${testCase.name} · interrupt`,
      ok: okInterrupt,
      reason: okInterrupt
        ? ""
        : `ended ${last.detailsHeight.toFixed(1)}px (baseline ${baseline.toFixed(1)}) open=${last.open} state=${last.state} inline="${last.inlineHeight}"`,
      peak: Math.max(...interrupted.map((s) => s.detailsHeight)).toFixed(1),
      frames: interrupted.length,
    });

    // Keyboard activation goes through the same click path.
    await page.evaluate(() => window.__d.querySelector("summary").focus());
    const keyed = await record(page, () => {}, 50);
    void keyed;
    await page.evaluate(sampler);
    await page.keyboard.press("Enter");
    await page.waitForTimeout(700);
    const kb = await page.evaluate(stop);
    results.push({ label: `${name} · ${testCase.name} · keyboard`, ...analyse(kb, true) });
    await page.evaluate(() => {
      window.__d.open = false;
    });
    await page.waitForTimeout(200);
  }

  await browser.close();
  if (errors.length) results.push({ label: `${name} · page errors`, ok: false, reason: errors.join(" | ") });
  return results;
}

const headed = process.argv.includes("--headed");
const engines = [
  [chromium, "chromium"],
  [webkit, "webkit"],
  [firefox, "firefox"],
];

const all = [];
for (const [engine, name] of engines) {
  try {
    all.push(...(await runBrowser(engine, name, headed)));
    all.push(await checkReducedMotion(engine, name));
  } catch (error) {
    all.push({ label: `${name}`, ok: false, reason: error.message.split("\n")[0] });
  }
}

let failed = 0;
for (const r of all) {
  if (!r.ok) failed += 1;
  const detail = [
    r.frames ? `${r.frames}f` : null,
    r.distinct ? `${r.distinct} distinct` : null,
    r.peak ? `peak ${r.peak}` : null,
  ]
    .filter(Boolean)
    .join(", ");
  console.log(`${r.ok ? "PASS" : "FAIL"}  ${r.label}${detail ? `  (${detail})` : ""}`);
  if (!r.ok && r.reason) console.log(`        ${r.reason}`);
}
console.log(`\n${all.length - failed}/${all.length} passed`);
process.exit(failed > 0 ? 1 : 0);
