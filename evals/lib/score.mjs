import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join } from "node:path";
import { AxeBuilder } from "@axe-core/playwright";
import { readSources, run, toMatcher, truncate } from "./util.mjs";

/** Points per check; they add up to 100. See evals/README.md. */
export const WEIGHTS = { typecheck: 15, lint: 15, build: 10, axe: 20, assertions: 40 };
const LINT_ERROR_COST = 5;
const LINT_WARNING_COST = 1;
const AXE_RULE_COST = 5;
const AXE_TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"];
const STEP_TIMEOUT = 3000;

const bin = (dir, name) => join(dir, "node_modules", ".bin", name);

export async function typecheck(dir) {
  const r = await run(bin(dir, "tsc"), ["--noEmit", "-p", "."], { cwd: dir, timeoutMs: 120_000 });
  const errors = (r.stdout.match(/error TS\d+/g) ?? []).length;
  return { pass: r.code === 0, errors, output: truncate(r.stdout + r.stderr) };
}

export async function lint(dir) {
  const r = await run(bin(dir, "eslint"), ["src", "--format", "json", "--no-warn-ignored"], { cwd: dir, timeoutMs: 120_000 });
  let files;
  try {
    files = JSON.parse(r.stdout);
  } catch {
    return { ran: false, errors: 0, warnings: 0, messages: [], output: truncate(r.stdout + r.stderr) };
  }
  const messages = files.flatMap((f) =>
    f.messages.map((m) => ({
      file: f.filePath.slice(dir.length + 1),
      line: m.line,
      rule: m.ruleId,
      severity: m.severity === 2 ? "error" : "warning",
      message: m.message,
    })),
  );
  const byRule = {};
  for (const m of messages) byRule[m.rule ?? "parse"] = (byRule[m.rule ?? "parse"] ?? 0) + 1;
  return {
    ran: true,
    errors: messages.filter((m) => m.severity === "error").length,
    warnings: messages.filter((m) => m.severity === "warning").length,
    byRule,
    messages,
  };
}

export async function build(dir) {
  const r = await run(bin(dir, "vite"), ["build", "--logLevel", "error"], { cwd: dir, timeoutMs: 180_000 });
  return { pass: r.code === 0 && existsSync(join(dir, "dist", "index.html")), output: truncate(r.stdout + r.stderr) };
}

const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2", ".ico": "image/x-icon" };

/** Same static server as scripts/check-a11y.mjs, falling back to index.html. */
async function serve(root) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, "http://x").pathname);
    let file = join(root, path);
    if (!existsSync(file) || statSync(file).isDirectory()) file = existsSync(join(file, "index.html")) ? join(file, "index.html") : join(root, "index.html");
    res.writeHead(200, { "Content-Type": TYPES[extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  return { server, url: `http://127.0.0.1:${server.address().port}/` };
}

async function load(context, url) {
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message ?? e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForTimeout(300);
  return { page, errors };
}

function locate(page, step) {
  const scope = step.within ? page.locator(step.within).first() : page;
  if (step.role) return scope.getByRole(step.role, step.name ? { name: toMatcher(step.name) } : {}).first();
  if (step.label) return scope.getByLabel(toMatcher(step.label)).first();
  if (step.text) return scope.getByText(toMatcher(step.text)).first();
  if (step.selector) return scope.locator(step.selector).first();
  throw new Error(`Step has no target: ${JSON.stringify(step)}`);
}

async function runStep(page, step) {
  const o = { timeout: STEP_TIMEOUT };
  switch (step.action) {
    case "click":
      return locate(page, step).click(o);
    case "fill":
      return locate(page, step).fill(step.value, o);
    case "check": {
      // Styled checkboxes often draw a box over a visually hidden input, which
      // fails Playwright's "receives pointer events" check; the input is still
      // the real control, so fall back to a forced check.
      const target = locate(page, step);
      return target.check({ timeout: 1500 }).catch(() => target.check({ ...o, force: true }));
    }
    case "focus":
      return locate(page, step).focus(o);
    case "press":
      return step.role || step.selector || step.label ? locate(page, step).press(step.key, o) : page.keyboard.press(step.key);
    case "wait":
      return page.waitForTimeout(step.ms ?? 300);
    case "setFiles":
      return locate(page, step).setInputFiles(
        step.files.map((f) => ({ name: f.name, mimeType: f.mimeType, buffer: Buffer.alloc(f.size ?? 1024, 1) })),
        o,
      );
    default:
      throw new Error(`Unknown step action "${step.action}"`);
  }
}

/** Named checks that are awkward to write as one expression. */
const CHECKS = {
  "inputs-labelled": () => {
    const fields = [...document.querySelectorAll("input, select, textarea")].filter(
      (el) => !["hidden", "submit", "button", "reset", "image"].includes(el.type) && (el.getClientRects().length > 0 || el.type === "file"),
    );
    const named = (el) => {
      const ids = (el.getAttribute("aria-labelledby") ?? "").split(/\s+/).filter(Boolean);
      return Boolean(
        [...(el.labels ?? [])].some((l) => l.textContent?.trim()) ||
          el.getAttribute("aria-label")?.trim() ||
          ids.some((id) => document.getElementById(id)?.textContent?.trim()) ||
          el.getAttribute("title")?.trim(),
      );
    };
    const missing = fields.filter((el) => !named(el)).map((el) => el.outerHTML.slice(0, 120));
    if (fields.length === 0) return { pass: false, detail: "no form fields found" };
    return { pass: missing.length === 0, detail: missing.length ? `unlabelled: ${missing.join(" | ")}` : `${fields.length} labelled` };
  },
};

const readValue = (locator, attribute) =>
  locator.evaluate((el, attr) => (attr === "textContent" ? el.textContent : attr === "innerText" ? el.innerText : el.getAttribute(attr)), attribute);

/** Runs one task assertion; returns { pass, detail }. */
async function assert(assertion, { sources, context, url, initial }) {
  const { type } = assertion;
  if (type === "imports") {
    const names = new Set();
    const re = /import\s+(?:type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g;
    for (const { text } of sources) {
      for (const m of text.matchAll(re)) {
        if (m[2] !== assertion.from) continue;
        for (const spec of m[1].split(",")) {
          const name = spec.trim().split(/\s+as\s+/)[0]?.replace(/^type\s+/, "");
          if (name) names.add(name);
        }
      }
    }
    const missing = (assertion.names ?? []).filter((n) => !names.has(n));
    const anyOk = !assertion.anyOf || assertion.anyOf.some((n) => names.has(n));
    return {
      pass: missing.length === 0 && anyOk,
      detail: missing.length ? `missing: ${missing.join(", ")}` : anyOk ? `imports ${[...names].join(", ")}` : `none of ${assertion.anyOf.join(", ")}`,
    };
  }
  if (type === "source") {
    const patterns = assertion.allOf ?? [assertion.pattern];
    const hits = patterns.map((p) => sources.filter((s) => new RegExp(p, assertion.flags ?? "").test(s.text)).map((s) => s.file));
    if (assertion.absent) {
      const files = [...new Set(hits.flat())];
      return { pass: files.length === 0, detail: files.length ? `found in ${files.join(", ")}` : "absent" };
    }
    const missing = patterns.filter((_, i) => hits[i].length === 0);
    return { pass: missing.length === 0, detail: missing.length ? `not found: ${missing.join(", ")}` : "present" };
  }

  if (!url) return { pass: false, detail: "build failed; nothing to load" };
  const fresh = Boolean(assertion.steps?.length || assertion.trigger);
  const { page } = fresh ? await load(context, url) : initial;
  try {
    for (const step of assertion.steps ?? []) await runStep(page, step);
    switch (type) {
      case "dom": {
        const count = await page.locator(assertion.selector).count();
        return countResult(count, assertion);
      }
      case "role": {
        const count = await page.getByRole(assertion.role, assertion.name ? { name: toMatcher(assertion.name) } : {}).count();
        return countResult(count, assertion);
      }
      case "eval": {
        const value = await page.evaluate(assertion.expression);
        return { pass: Boolean(value), detail: `→ ${JSON.stringify(value)?.slice(0, 80)}` };
      }
      case "check": {
        const check = CHECKS[assertion.check];
        if (!check) throw new Error(`Unknown check "${assertion.check}"`);
        return await page.evaluate(check);
      }
      case "changes": {
        const target = assertion.selector ? page.locator(assertion.selector).first() : locate(page, assertion.trigger);
        const before = await readValue(target, assertion.attribute);
        await runStep(page, assertion.trigger);
        await page.waitForTimeout(300);
        const after = await readValue(target, assertion.attribute);
        return { pass: before !== after, detail: `${JSON.stringify(before)?.slice(0, 40)} → ${JSON.stringify(after)?.slice(0, 40)}` };
      }
      default:
        throw new Error(`Unknown assertion type "${type}"`);
    }
  } catch (error) {
    return { pass: false, detail: String(error.message ?? error).split("\n")[0].slice(0, 200) };
  } finally {
    if (fresh) await page.close();
  }
}

function countResult(count, { min, max }) {
  min ??= max === 0 ? 0 : 1;
  const pass = count >= min && (max == null || count <= max);
  return { pass, detail: `${count} found (want ${max == null ? `≥ ${min}` : min === max ? min : `${min}–${max}`})` };
}

/**
 * Loads the built app in Chromium and runs axe (light and dark), the
 * task's assertions and its screenshots. Without a build, only the
 * source-level assertions can pass.
 */
export async function inspect(task, dir, { browser, outDir, built }) {
  const sources = readSources(dir);
  const result = { axe: null, assertions: [], screenshots: [], consoleErrors: [] };
  let server;
  let url = null;
  const contexts = [];
  let initial = null;
  try {
    if (built) {
      ({ server, url } = await serve(join(dir, "dist")));
      result.axe = { violations: [], seriousCritical: 0, rules: [] };
      for (const scheme of ["light", "dark"]) {
        const context = await browser.newContext({ colorScheme: scheme, viewport: { width: 1280, height: 900 } });
        contexts.push(context);
        const { page, errors } = await load(context, url);
        const axe = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
        for (const v of axe.violations) {
          result.axe.violations.push({ scheme, id: v.id, impact: v.impact, help: v.help, nodes: v.nodes.length, targets: v.nodes.slice(0, 3).map((n) => n.target.join(" ")) });
        }
        if (scheme === "light") {
          result.consoleErrors = errors;
          await page.screenshot({ path: join(outDir, "screenshot.png"), fullPage: true });
          result.screenshots.push({ name: "Initial", file: "screenshot.png" });
          initial = { page, errors };
        } else {
          await page.screenshot({ path: join(outDir, "screenshot-dark.png"), fullPage: true });
          result.screenshots.push({ name: "Dark", file: "screenshot-dark.png" });
          await page.close();
        }
      }
      const serious = result.axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      result.axe.rules = [...new Set(serious.map((v) => v.id))];
      result.axe.seriousCritical = result.axe.rules.length;
    }

    const lightContext = contexts[0];
    const renders = built
      ? await initial.page.evaluate(() => (document.body.innerText ?? "").trim().length > 0)
      : false;
    result.assertions.push({
      id: "renders",
      description: "The app renders without uncaught errors",
      pass: renders && !result.consoleErrors.some((e) => !/favicon/i.test(e)),
      detail: !built ? "build failed" : result.consoleErrors.length ? result.consoleErrors.slice(0, 2).join(" | ").slice(0, 200) : renders ? "ok" : "empty page",
    });
    for (const assertion of task.assertions) {
      const r = await assert(assertion, { sources, context: lightContext, url, initial });
      result.assertions.push({ id: assertion.id, description: assertion.description, ...r });
    }
    for (const [i, shot] of (task.screenshots ?? []).entries()) {
      if (!url) break;
      const { page } = await load(lightContext, url);
      try {
        for (const step of shot.steps ?? []) await runStep(page, step);
        await page.waitForTimeout(400);
        const file = `screenshot-${i + 1}.png`;
        await page.screenshot({ path: join(outDir, file), fullPage: true });
        result.screenshots.push({ name: shot.name, file });
      } catch (error) {
        result.screenshots.push({ name: shot.name, error: String(error.message).split("\n")[0] });
      } finally {
        await page.close();
      }
    }
  } finally {
    for (const c of contexts) await c.close();
    server?.close();
  }
  return result;
}

/**
 * Hygiene points (typecheck, lint, build, axe) are multiplied by the share
 * of assertions passed, so an app that doesn't do the task can't score on
 * being tidy: the untouched template compiles, lints and passes axe, and
 * still scores under 20.
 */
export function computeScore({ typecheck, lint, build, inspect }) {
  const assertions = inspect.assertions;
  const passed = assertions.filter((a) => a.pass).length;
  const rate = passed / Math.max(1, assertions.length);
  const lintPenalty = lint.ran ? lint.errors * LINT_ERROR_COST + lint.warnings * LINT_WARNING_COST : WEIGHTS.lint;
  const raw = {
    typecheck: typecheck.pass ? WEIGHTS.typecheck : 0,
    lint: Math.max(0, WEIGHTS.lint - lintPenalty),
    build: build.pass ? WEIGHTS.build : 0,
    axe: inspect.axe ? Math.max(0, WEIGHTS.axe - inspect.axe.seriousCritical * AXE_RULE_COST) : 0,
  };
  const round = (n) => Math.round(n * 10) / 10;
  const breakdown = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, round(v * rate)]));
  breakdown.assertions = round(WEIGHTS.assertions * rate);
  const total = round(Object.values(raw).reduce((a, b) => a + b, 0) * rate + WEIGHTS.assertions * rate);
  return { total, breakdown, hygiene: raw, assertionRate: round(rate * 100) / 100, assertionsPassed: passed, assertionsTotal: assertions.length };
}
