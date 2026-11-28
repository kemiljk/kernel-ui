/**
 * @kernelui-lib/testing — WAI-ARIA Authoring Practices pattern checks and
 * Kernel UI component checks, for your own test suite.
 *
 * Everything here is plain DOM: no test-runner globals, no framework. It runs
 * in vitest or jest (jsdom or happy-dom) and in a real browser (Playwright's
 * `page.evaluate`, via `@kernelui-lib/testing/browser` or
 * `@kernelui-lib/testing/playwright`). What a simulated DOM can't do — layout,
 * the Popover API, modal `<dialog>` focus — is reported as `skipped`, never as
 * a pass or a failure.
 */
import { checkAnchor, findAnchors, resolveComponent, COMPONENT_SPECS, KERNEL_COMPONENTS } from "./components.js";
import { PATTERNS, patternNames, checkCommon } from "./patterns/index.js";
import { Run } from "./run.js";
import type { CheckOptions, CheckResult, Issue, PatternName } from "./types.js";

export type { CheckOptions, CheckResult, EnvironmentName, Issue, PatternName, Severity, Skipped } from "./types.js";
export type { RegistryComponent } from "./generated/registry.js";
export { accessibleName, detectEnvironment } from "./dom.js";
export { COMPONENT_SPECS, KERNEL_COMPONENTS, patternNames };

/** Result of `checkComponent`/`checkPage`: also lists which Kernel components were found. */
export interface ComponentCheckResult extends CheckResult {
  /** Instances checked, by React export name: `{ Tabs: 1, Switch: 2 }`. */
  found: Record<string, number>;
}

function assertElement(root: unknown, fn: string): asserts root is Element {
  if (!root || typeof (root as Element).querySelectorAll !== "function") {
    throw new TypeError(`${fn}: expected a DOM Element as the first argument.`);
  }
}

/**
 * Check one WAI-ARIA pattern on `root` (the widget itself or anything that
 * contains it): required roles and elements, accessible names, state
 * consistency, and keyboard behaviour via dispatched events.
 *
 * ```ts
 * const result = await checkPattern(container, "tabs", { act });
 * expect(result.issues).toEqual([]);
 * ```
 */
export async function checkPattern(root: Element, pattern: PatternName, options: CheckOptions = {}): Promise<CheckResult> {
  assertElement(root, "checkPattern");
  const check = PATTERNS[pattern];
  if (!check) throw new TypeError(`checkPattern: unknown pattern "${pattern}". Known: ${patternNames.join(", ")}.`);
  const run = new Run(root, options);
  await check(run, root);
  return run.result();
}

/**
 * Check a Kernel component: its APG pattern(s) plus Kernel's own invariants
 * (a field's label stays in the DOM under hideLabel, icons are decorative,
 * clickable parts are unselectable). `name` is the React export
 * ("DropdownMenu"), the display name, the docs slug or the custom element tag.
 * Works on React output and `@kernelui-lib/elements` alike — both render the
 * same class names.
 */
export async function checkComponent(root: Element, name: string, options: CheckOptions = {}): Promise<ComponentCheckResult> {
  assertElement(root, "checkComponent");
  const component = resolveComponent(name);
  if (!component) throw new TypeError(`checkComponent: "${name}" isn't a Kernel component. Known: ${KERNEL_COMPONENTS.map((c) => c.export).join(", ")}.`);
  const run = new Run(root, options);
  const anchors = findAnchors(root, component);
  if (!anchors.length) {
    run.fail("kernel/present", `No Kernel ${component.export} found in the given root (looked for ${COMPONENT_SPECS[component.folder] ? `.kernel-${component.folder}-${COMPONENT_SPECS[component.folder]!.anchor}` : `kernel-${component.folder}-* classes`}).`, root);
  } else run.pass("kernel/present");
  for (const anchor of anchors) {
    checkCommon(run, anchor);
    await checkAnchor(run, anchor, component);
  }
  return { ...run.result(), found: anchors.length ? { [component.export]: anchors.length } : {} };
}

/**
 * Scan `root` (default: `document.body`) for every Kernel component —
 * React or custom element — and check each one, plus page-wide rules for the
 * composed UI: unique ids, resolving id references, named controls, no nested
 * interactive elements.
 */
export async function checkPage(root?: Element, options: CheckOptions = {}): Promise<ComponentCheckResult> {
  const target = root ?? globalThis.document?.body;
  assertElement(target, "checkPage");
  const run = new Run(target, options);
  checkCommon(run, target);
  const found: Record<string, number> = {};
  const seen = new WeakMap<Element, Set<string>>();
  for (const component of KERNEL_COMPONENTS) {
    if (!COMPONENT_SPECS[component.folder]) continue;
    const anchors = findAnchors(target, component);
    if (!anchors.length) continue;
    found[component.export] = anchors.length;
    for (const anchor of anchors) await checkAnchor(run, anchor, component, seen);
  }
  return { ...run.result(), found };
}

/** A readable, multi-line summary of a result's issues (and skips, with `verbose`). */
export function formatResult(result: CheckResult, { verbose = false }: { verbose?: boolean } = {}): string {
  const lines: string[] = [];
  const fmt = (issue: Issue) =>
    `  ${issue.severity === "error" ? "✗" : "!"} [${issue.rule}] ${issue.message}${issue.target ? `\n      at ${issue.target}${issue.component ? ` (Kernel ${issue.component})` : ""}` : ""}`;
  const errors = result.issues.filter((i) => i.severity === "error");
  const warnings = result.issues.filter((i) => i.severity === "warning");
  lines.push(`${errors.length} error(s), ${warnings.length} warning(s), ${result.passes.length} passed, ${result.skipped.length} skipped (${result.environment})`);
  for (const issue of [...errors, ...warnings]) lines.push(fmt(issue));
  if (verbose) for (const skip of result.skipped) lines.push(`  - [${skip.rule}] skipped (${skip.kind}): ${skip.reason}`);
  return lines.join("\n");
}

export class PatternAssertionError extends Error {
  constructor(
    message: string,
    readonly result: CheckResult,
  ) {
    super(message);
    this.name = "PatternAssertionError";
  }
}

function assertResult(result: CheckResult, what: string) {
  if (!result.passed) throw new PatternAssertionError(`${what} failed:\n${formatResult(result)}`, result);
  return result;
}

/** `checkPattern`, throwing a `PatternAssertionError` listing every issue when it fails. */
export async function assertPattern(root: Element, pattern: PatternName, options?: CheckOptions) {
  return assertResult(await checkPattern(root, pattern, options), `checkPattern(${JSON.stringify(pattern)})`);
}

/** `checkComponent`, throwing when it fails. */
export async function assertComponent(root: Element, name: string, options?: CheckOptions) {
  return assertResult(await checkComponent(root, name, options), `checkComponent(${JSON.stringify(name)})`) as ComponentCheckResult;
}

/** `checkPage`, throwing when it fails. */
export async function assertPage(root?: Element, options?: CheckOptions) {
  return assertResult(await checkPage(root, options), "checkPage()") as ComponentCheckResult;
}
