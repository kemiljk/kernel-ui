/** A WAI-ARIA Authoring Practices pattern this package can check. */
export type PatternName =
  | "accordion"
  | "button"
  | "checkbox"
  | "combobox"
  | "dialog"
  | "disclosure"
  | "field"
  | "grid"
  | "listbox"
  | "menu"
  | "radio-group"
  | "select"
  | "slider"
  | "switch"
  | "tabs"
  | "toggle-button"
  | "toolbar"
  | "tooltip";

/**
 * `error` fails the check. `warning` is reported but only fails when
 * `strict: true` is passed — use it for APG recommendations that aren't
 * requirements (a tablist without a label, say).
 */
export type Severity = "error" | "warning";

export interface Issue {
  /** `<pattern>/<rule>`, e.g. `tabs/one-selected`. Pass it in `ignore` to silence it. */
  rule: string;
  severity: Severity;
  message: string;
  /** A short, serialisable description of the offending element, e.g. `button#save.kernel-Button-root "Save"`. */
  target?: string;
  /** The Kernel component the element belongs to, when it could be identified. */
  component?: string;
}

/**
 * A check that couldn't run here. `environment` means the DOM implementation
 * lacks something (jsdom has no layout and no popover API); `native` means
 * the behaviour is the browser's own (a radio group's arrow keys, Escape on a
 * `<dialog>`), which synthetic events can't trigger and Kernel doesn't
 * reimplement — the check confirmed the native element is used instead.
 */
export interface Skipped {
  rule: string;
  kind: "environment" | "native" | "not-applicable";
  reason: string;
  target?: string;
}

export interface CheckResult {
  /** No errors (and, with `strict`, no warnings). */
  passed: boolean;
  issues: Issue[];
  skipped: Skipped[];
  /** Rule ids that ran and passed, once per instance checked. */
  passes: string[];
  /** Which DOM implementation the checks ran in. */
  environment: EnvironmentName;
}

export type EnvironmentName = "browser" | "jsdom" | "happy-dom";

export interface CheckOptions {
  /**
   * Run interaction checks (dispatched keydown/click, focus movement).
   * Defaults to `true`. Interactions change state — a tab gets selected, a
   * switch is flipped and flipped back — and are restored where possible.
   */
  interactions?: boolean;
  /**
   * Wraps every interaction, so a framework can flush updates. Pass React
   * Testing Library's `act` in React tests to avoid "not wrapped in act"
   * warnings.
   */
  act?: (callback: () => Promise<void>) => unknown;
  /**
   * Called after each interaction before the DOM is read. Defaults to one
   * macrotask plus an animation frame (capped at 50ms).
   */
  settle?: () => Promise<void>;
  /** Rule ids (`tabs/tablist-name`) or whole patterns (`tabs`) to skip. */
  ignore?: string[];
  /** Treat warnings as failures. */
  strict?: boolean;
}
