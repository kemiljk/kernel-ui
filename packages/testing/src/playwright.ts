/**
 * Playwright (or any CDP/WebDriver page object with `evaluate` and
 * `addScriptTag`) helpers. They inject the browser bundle into the page once,
 * then run the checks inside it, so they see real layout, the Popover API
 * and modal `<dialog>` focus. Results are plain JSON.
 *
 * ```ts
 * import { assertComponentInPage } from "@kernelui-lib/testing/playwright";
 * await page.goto("/settings");
 * await assertComponentInPage(page, "#plan", "RadioGroup");
 * ```
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CheckOptions, CheckResult, PatternName } from "./types.js";

/** The structural subset of Playwright's `Page` these helpers use. */
export interface PageLike {
  evaluate<R, A>(fn: (arg: A) => R | Promise<R>, arg: A): Promise<R>;
  addScriptTag(options: { content: string }): Promise<unknown>;
}

/** Options that can cross into the page: no functions. */
export type BrowserCheckOptions = Omit<CheckOptions, "act" | "settle">;

export interface ComponentCheckResult extends CheckResult {
  found: Record<string, number>;
}

/** Absolute path of the IIFE bundle that defines `window.KernelTesting`. */
export const browserBundlePath = fileURLToPath(new URL("./kernel-testing.global.js", import.meta.url));

let bundle: string | undefined;

/** Adds `window.KernelTesting` to the page unless it's already there. */
export async function injectKernelTesting(page: PageLike) {
  const present = await page.evaluate(() => typeof (globalThis as { KernelTesting?: unknown }).KernelTesting !== "undefined", undefined);
  if (present) return;
  bundle ??= readFileSync(browserBundlePath, "utf8");
  await page.addScriptTag({ content: bundle });
}

type Call =
  | { fn: "checkPattern"; selector: string; arg: string; options: BrowserCheckOptions }
  | { fn: "checkComponent"; selector: string; arg: string; options: BrowserCheckOptions }
  | { fn: "checkPage"; selector: string; arg: null; options: BrowserCheckOptions };

async function call<R>(page: PageLike, payload: Call): Promise<R> {
  await injectKernelTesting(page);
  return page.evaluate(async ({ fn, selector, arg, options }: Call) => {
    const api = (globalThis as unknown as { KernelTesting: Record<string, (...args: unknown[]) => Promise<unknown>> }).KernelTesting;
    const root = document.querySelector(selector);
    if (!root) throw new Error(`@kernelui-lib/testing: nothing matches ${selector}`);
    return (fn === "checkPage" ? api.checkPage!(root, options) : api[fn]!(root, arg, options)) as Promise<R>;
  }, payload);
}

export function checkPatternInPage(page: PageLike, selector: string, pattern: PatternName, options: BrowserCheckOptions = {}) {
  return call<CheckResult>(page, { fn: "checkPattern", selector, arg: pattern, options });
}

export function checkComponentInPage(page: PageLike, selector: string, name: string, options: BrowserCheckOptions = {}) {
  return call<ComponentCheckResult>(page, { fn: "checkComponent", selector, arg: name, options });
}

export function checkPageInPage(page: PageLike, selector = "body", options: BrowserCheckOptions = {}) {
  return call<ComponentCheckResult>(page, { fn: "checkPage", selector, arg: null, options });
}

function format(result: CheckResult) {
  return result.issues
    .filter((issue) => issue.severity === "error" || issue.severity === "warning")
    .map((issue) => `  ${issue.severity === "error" ? "✗" : "!"} [${issue.rule}] ${issue.message}${issue.target ? `\n      at ${issue.target}` : ""}`)
    .join("\n");
}

function assert<R extends CheckResult>(result: R, what: string): R {
  if (!result.passed) throw new Error(`${what} failed:\n${format(result)}`);
  return result;
}

export async function assertPatternInPage(page: PageLike, selector: string, pattern: PatternName, options?: BrowserCheckOptions) {
  return assert(await checkPatternInPage(page, selector, pattern, options), `checkPattern(${selector}, "${pattern}")`);
}

export async function assertComponentInPage(page: PageLike, selector: string, name: string, options?: BrowserCheckOptions) {
  return assert(await checkComponentInPage(page, selector, name, options), `checkComponent(${selector}, "${name}")`);
}

export async function assertPageInPage(page: PageLike, selector = "body", options?: BrowserCheckOptions) {
  return assert(await checkPageInPage(page, selector, options), `checkPage(${selector})`);
}
