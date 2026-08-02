/**
 * Same frame-by-frame disclosure check as `disclosure-motion-check.mjs`, but
 * pointed at the running docs site so the React build and its real page
 * context (hydration, sticky chrome, nested demos) are covered too.
 *
 * Usage: DOCS_ORIGIN=http://localhost:4323 node scripts/disclosure-docs-check.mjs
 */
import { chromium } from "playwright";

const BASE = process.env.DOCS_ORIGIN ?? "http://localhost:4321";

const CASES = [
  { name: "Accordion demo", path: "/components/accordion", selector: "details.kernel-Accordion-item", nth: 1 },
  { name: "Accordion playground", path: "/components/accordion", selector: "details.kernel-Accordion-item", nth: 4 },
  { name: "ToolCall", path: "/components/tool-call", selector: "details.kernel-ToolCall-root", nth: 0 },
  { name: "Docs usage accordion", path: "/components/accordion", selector: "details.usage-accordion", nth: 0 },
];

const sampler = () => {
  window.__samples = [];
  const tick = () => {
    const d = window.__d;
    window.__samples.push({
      h: d.getBoundingClientRect().height,
      open: d.open,
      state: d.getAttribute("data-state"),
    });
    window.__raf = requestAnimationFrame(tick);
  };
  window.__raf = requestAnimationFrame(tick);
};

const stop = () => {
  cancelAnimationFrame(window.__raf);
  return window.__samples;
};

function analyse(samples, expectOpen) {
  const hs = samples.map((s) => s.h);
  const settled = expectOpen ? hs[hs.length - 1] : hs[0];
  const peak = Math.max(...hs);
  const distinct = new Set(hs.map((h) => Math.round(h))).size;
  const problems = [];
  if (peak > settled + 1) {
    problems.push(`overshoot ${peak.toFixed(1)} vs settled ${settled.toFixed(1)}`);
  }
  if (distinct < 4) problems.push(`${distinct} distinct heights (snap)`);
  const last = samples[samples.length - 1];
  if (last.open !== expectOpen) problems.push(`ended open=${last.open}`);
  if (last.state) problems.push(`left data-state=${last.state}`);
  return { ok: problems.length === 0, reason: problems.join("; "), distinct, peak: peak.toFixed(1) };
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
const results = [];

for (const c of CASES) {
  try {
    await page.goto(`${BASE}${c.path}`, { waitUntil: "networkidle" });
    // Islands are `client:visible`; sweep the page so they all hydrate.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(900);

    const ready = await page.evaluate(
      ({ selector, nth }) => {
        const d = document.querySelectorAll(selector)[nth];
        if (!d) return false;
        d.scrollIntoView({ block: "center" });
        window.__d = d;
        return true;
      },
      c,
    );
    if (!ready) {
      results.push({ label: c.name, ok: false, reason: "not found" });
      continue;
    }

    // Normalise to closed through a real click, so React state stays in sync.
    if (await page.evaluate(() => window.__d.open)) {
      await page.evaluate(() => window.__d.querySelector("summary").click());
      await page.waitForTimeout(700);
    }

    const click = () => window.__d.querySelector("summary").click();
    for (const phase of ["open", "close"]) {
      await page.evaluate(sampler);
      await page.evaluate(click);
      await page.waitForTimeout(700);
      const samples = await page.evaluate(stop);
      results.push({ label: `${c.name} · ${phase}`, ...analyse(samples, phase === "open") });
    }
  } catch (error) {
    results.push({ label: c.name, ok: false, reason: error.message.split("\n")[0] });
  }
}

await browser.close();

let failed = 0;
for (const r of results) {
  if (!r.ok) failed += 1;
  console.log(
    `${r.ok ? "PASS" : "FAIL"}  ${r.label}${r.distinct ? `  (${r.distinct} distinct, peak ${r.peak})` : ""}`,
  );
  if (!r.ok && r.reason) console.log(`        ${r.reason}`);
}
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed > 0 ? 1 : 0);
