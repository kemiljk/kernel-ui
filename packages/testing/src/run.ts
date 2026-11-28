import { activeElement, describe, detectEnvironment, kernelComponentOf, type Environment } from "./dom.js";
import type { CheckOptions, CheckResult, Issue, Severity, Skipped } from "./types.js";

/**
 * One check run: collects issues, skips and passes, and owns the interaction
 * helpers so every pattern dispatches events the same way.
 */
export class Run {
  readonly issues: Issue[] = [];
  readonly skipped: Skipped[] = [];
  readonly passes: string[] = [];
  readonly env: Environment;
  readonly doc: Document;
  readonly interactions: boolean;
  private readonly ignore: string[];

  constructor(
    root: Element,
    readonly options: CheckOptions = {},
  ) {
    this.doc = root.ownerDocument;
    this.env = detectEnvironment(this.doc);
    this.interactions = options.interactions !== false;
    this.ignore = options.ignore ?? [];
  }

  private ignored(rule: string) {
    return this.ignore.some((entry) => entry === rule || rule.startsWith(`${entry}/`));
  }

  pass(rule: string) {
    if (!this.ignored(rule)) this.passes.push(rule);
  }

  fail(rule: string, message: string, el?: Element | null, severity: Severity = "error") {
    if (this.ignored(rule)) return;
    const issue: Issue = { rule, severity, message };
    if (el) {
      issue.target = describe(el);
      const component = kernelComponentOf(el);
      if (component) issue.component = component;
    }
    this.issues.push(issue);
  }

  warn(rule: string, message: string, el?: Element | null) {
    this.fail(rule, message, el, "warning");
  }

  /** `fail` unless `ok`; `pass` otherwise. Returns `ok`. */
  expect(ok: boolean, rule: string, message: string, el?: Element | null, severity: Severity = "error") {
    if (ok) this.pass(rule);
    else this.fail(rule, message, el, severity);
    return ok;
  }

  skip(rule: string, kind: Skipped["kind"], reason: string, el?: Element | null) {
    if (this.ignored(rule)) return;
    const entry: Skipped = { rule, kind, reason };
    if (el) entry.target = describe(el);
    this.skipped.push(entry);
  }

  /** Skip an interaction rule when interactions are off. Returns whether to run it. */
  canInteract(rule: string) {
    if (this.interactions) return !this.ignored(rule);
    this.skip(rule, "not-applicable", "interactions: false");
    return false;
  }

  /* ---------------------------------------------------------------- */
  /* Interactions                                                      */
  /* ---------------------------------------------------------------- */

  async settle() {
    if (this.options.settle) return this.options.settle();
    const win = this.doc.defaultView;
    await Promise.resolve();
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise<void>((resolve) => {
      const timer = setTimeout(resolve, 50);
      if (win?.requestAnimationFrame) {
        win.requestAnimationFrame(() => {
          clearTimeout(timer);
          resolve();
        });
      }
    });
    await Promise.resolve();
  }

  /** Settles repeatedly until `predicate` holds or `timeout` ms pass (for state that changes after an exit transition). */
  async waitFor(predicate: () => boolean, timeout = 600): Promise<boolean> {
    const start = Date.now();
    if (predicate()) return true;
    while (Date.now() - start < timeout) {
      if (this.options.act) await this.options.act(() => this.settle());
      else await this.settle();
      if (predicate()) return true;
    }
    return false;
  }

  private async perform(action: () => void) {
    const run = async () => {
      action();
      await this.settle();
    };
    if (this.options.act) await this.options.act(run);
    else await run();
  }

  async focus(el: Element) {
    await this.perform(() => (el as HTMLElement).focus());
  }

  async click(el: Element) {
    await this.perform(() => (el as HTMLElement).click());
  }

  /** Dispatches keydown then keyup on `target` (defaults to the focused element). */
  async press(key: string, target?: Element | null, init: KeyboardEventInit = {}) {
    const el = target ?? activeElement(this.doc) ?? this.doc.body;
    const win = this.doc.defaultView as (Window & typeof globalThis) | null;
    const Keyboard = win?.KeyboardEvent ?? KeyboardEvent;
    const options: KeyboardEventInit = { key, code: codeFor(key), bubbles: true, cancelable: true, composed: true, ...init };
    let prevented = false;
    await this.perform(() => {
      const down = new Keyboard("keydown", options);
      el.dispatchEvent(down);
      prevented = down.defaultPrevented;
      el.dispatchEvent(new Keyboard("keyup", options));
    });
    return prevented;
  }

  get focused() {
    return activeElement(this.doc);
  }

  result(): CheckResult {
    const blocking = this.issues.filter((issue) => issue.severity === "error" || this.options.strict);
    return {
      passed: blocking.length === 0,
      issues: this.issues,
      skipped: this.skipped,
      passes: this.passes,
      environment: this.env.name,
    };
  }
}

function codeFor(key: string) {
  if (key === " ") return "Space";
  if (key.length === 1) return /[a-z]/i.test(key) ? `Key${key.toUpperCase()}` : key;
  return key;
}
