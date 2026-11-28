/** What an agent can do to a node. Each one is performed the way a person
 * would do it, through the element's own events and default actions. */
export type AgentAction =
  | "press"
  | "type"
  | "clear"
  | "select"
  | "check"
  | "uncheck"
  | "toggle"
  | "open"
  | "close"
  | "focus"
  | "submit"
  | "scroll"
  | "setValue"
  | "key";

export const AGENT_ACTIONS: readonly AgentAction[] = [
  "press",
  "type",
  "clear",
  "select",
  "check",
  "uncheck",
  "toggle",
  "open",
  "close",
  "focus",
  "submit",
  "scroll",
  "setValue",
  "key",
];

/** Arguments a step may carry. Which ones apply depends on the action. */
export interface AgentStepArgs {
  /** `type`: the text to enter. */
  text?: string;
  /** `type`: add to the current value instead of replacing it. */
  append?: boolean;
  /** `select`: the option's value or visible label (matched
   * case-insensitively). `setValue`: the new value of a slider, number,
   * date/time or colour field, e.g. `75` or `"2026-03-14"`. */
  value?: string | number;
  /** `key`: the key to press, e.g. `"Enter"`, `"Escape"`, `"ArrowDown"`,
   * `"Shift+Tab"` or a single character. */
  key?: string;
  /** `select` on a multi-select: every option to select. */
  values?: string[];
  /** `scroll`: where to scroll a scrollable node. Without it, the node is
   * scrolled into view. */
  to?: "top" | "bottom" | "into-view";
}

export interface AgentStep {
  /** A `ref` from `snapshot()` or `query()`. */
  ref: string;
  action: AgentAction;
  args?: AgentStepArgs;
}

export type Checked = boolean | "mixed";

export interface SnapshotOption {
  value: string;
  label: string;
  selected?: true;
  disabled?: true;
}

/** One node of the snapshot tree. Only meaningful fields are present, so the
 * JSON stays small enough to hand to a model on every turn. */
export interface SnapshotNode {
  /** ARIA role, implicit (from the element) or explicit. */
  role: string;
  /** Accessible name, computed like a screen reader would. */
  name?: string;
  /** Stable handle for `act()`. Present on every actionable node. */
  ref?: string;
  /** The Kernel component this node belongs to, e.g. `"Switch"`. */
  component?: string;
  /** Text from `aria-describedby`: hints and error messages. */
  description?: string;
  /** Current value. `"[redacted]"` for passwords, one-time codes and card
   * fields (see `redacted`). */
  value?: string;
  /** True when `value` was withheld. */
  redacted?: true;
  placeholder?: string;
  /** `<input type>` when it changes what `type`/`press` mean (email,
   * number, date, file…). */
  inputType?: string;
  /** Heading level. */
  level?: number;
  /** Link target. */
  href?: string;
  /** Text of a live region (`alert`, `status`). */
  text?: string;
  checked?: Checked;
  selected?: boolean;
  expanded?: boolean;
  pressed?: Checked;
  disabled?: true;
  invalid?: true;
  required?: true;
  readonly?: true;
  multiline?: true;
  multiselectable?: true;
  focused?: true;
  min?: string;
  max?: string;
  /** Options of a `<select>`, or of a combobox whose popup is closed. */
  options?: SnapshotOption[];
  /** How many options were left out of `options`. */
  moreOptions?: number;
  children?: SnapshotNode[];
}

export interface Snapshot {
  url: string;
  title: string;
  /** Top-level nodes under the bridge's root. */
  nodes: SnapshotNode[];
  /** `ref` of the focused node, when it's actionable. */
  focused?: string;
  /** Number of actionable nodes (nodes with a `ref`). */
  refs: number;
  /** True when `maxNodes` cut the tree short. */
  truncated?: true;
}

/** Why a step needs a person's say-so. */
export type ConfirmReason =
  /** The target or an ancestor has `data-kernel-agent-confirm`. */
  | "marked"
  /** Pressing a danger-variant button (`data-variant="danger"`, which
   * Kernel's `Button variant="danger"` sets). */
  | "destructive"
  /** The step would submit a form. */
  | "submit"
  /** The `allow` policy returned `"confirm"` for an otherwise unflagged step. */
  | "policy";

export interface ConfirmRequest {
  step: AgentStep;
  target: Element;
  /** The target as it appears in the snapshot (role, name, component…). */
  node: SnapshotNode;
  reason: ConfirmReason;
  /** One-line plain-English summary, e.g. `Press "Delete project" (button)`.
   * Uses `data-kernel-agent-confirm`'s value when the attribute has one. */
  message: string;
}

/** Return value of an `allow` policy: run, refuse, or ask a person. */
export type AllowDecision = boolean | "confirm";

export interface AllowContext {
  node: SnapshotNode;
  /** Set when the step would need confirmation under the default policy. */
  confirmReason?: ConfirmReason;
}

export type ElementFilter = string | ((element: Element) => boolean);

export interface AgentBridgeOptions {
  /** Only content inside this element is visible to, or operable by, the
   * agent. Defaults to `document.body`. */
  root?: Element | null;
  /** Policy for every step. Return `true` to run it, `false` to refuse, or
   * `"confirm"` to ask a person through `confirm`. The default asks for
   * marked, destructive and submitting steps and runs the rest. A target
   * marked with `data-kernel-agent-confirm` is always confirmed unless the
   * policy refuses it outright: returning `true` can't skip the prompt. */
  allow?: (step: AgentStep, target: Element, context: AllowContext) => AllowDecision;
  /** Asks a person to approve a step. Resolve `true` to run it. Defaults to
   * `window.confirm`; render Kernel's `ToolApproval` instead in an app. */
  confirm?: (request: ConfirmRequest) => Promise<boolean> | boolean;
  /** Only nodes matching (or inside an element matching) this selector or
   * predicate get a `ref`. Landmarks and headings still appear for context. */
  include?: ElementFilter;
  /** Elements matching this selector or predicate, and everything inside
   * them, are left out entirely. `[data-kernel-agent-ignore]` always is. */
  exclude?: ElementFilter;
  /** Upper bound on nodes in one snapshot. Defaults to 600. */
  maxNodes?: number;
}

export interface StepResult {
  index: number;
  ref: string;
  action: AgentAction;
  ok: boolean;
  /** Why the step failed or was refused. */
  error?: string;
  /** Extra detail on success, e.g. `"already checked"`. */
  note?: string;
  /** Set when a person was asked: whether they approved. */
  confirmed?: boolean;
}

export interface NodeChange {
  ref: string;
  role: string;
  name?: string;
  /** Field → `[before, after]`. */
  changes: Record<string, [unknown, unknown]>;
}

export interface SnapshotDiff {
  /** Nodes that appeared (a dialog opening, an error message). */
  added: SnapshotNode[];
  /** Refs that disappeared. */
  removed: { ref: string; role: string; name?: string }[];
  changed: NodeChange[];
}

export interface ActResult {
  /** True when every step ran. */
  ok: boolean;
  results: StepResult[];
  /** What changed in the UI between before the first step and after the
   * last one settled. Take a fresh `snapshot()` for the full picture. */
  diff: SnapshotDiff;
}

export interface ActOptions {
  steps: AgentStep[];
  /** Keep going after a failed step. Defaults to `false`. */
  continueOnError?: boolean;
}

export interface QueryOptions {
  role?: string;
  /** Matched case-insensitively as a substring of the accessible name. */
  name?: string;
  component?: string;
  /** Matched against name, value, description and live-region text. */
  text?: string;
  /** Only nodes with a `ref`. Defaults to `true`. */
  actionable?: boolean;
}

export interface ObserveOptions {
  /** Quiet period before the callback fires. Defaults to 150 ms. */
  debounce?: number;
}

export interface SettleOptions {
  /** How long the DOM must stay unchanged. Defaults to 100 ms. */
  quiet?: number;
  /** Give up waiting after this long. Defaults to 2000 ms. */
  timeout?: number;
}

export interface RegisterToolsOptions {
  /** Tool-name prefix: `kernel` gives `kernel_snapshot`, `kernel_act`,
   * `kernel_query`. */
  prefix?: string;
}

export interface AgentBridge {
  readonly root: Element;
  snapshot(): Snapshot;
  act(options: ActOptions): Promise<ActResult>;
  query(options: QueryOptions): SnapshotNode[];
  /** Calls back (debounced) whenever the UI under root changes. Returns a
   * function that stops observing. */
  observe(callback: (diff: SnapshotDiff, snapshot: Snapshot) => void, options?: ObserveOptions): () => void;
  /** Resolves once the DOM under root has stopped changing. */
  settle(options?: SettleOptions): Promise<void>;
  /** Registers snapshot/act/query as WebMCP tools when the browser supports
   * WebMCP. Returns an unregister function (a no-op when unsupported). */
  registerTools(options?: RegisterToolsOptions): () => void;
  /** Resolves a ref to its element, or `null` if it's gone or out of scope. */
  element(ref: string): Element | null;
  /** Stops every observer and unregisters every tool this bridge created. */
  destroy(): void;
}
