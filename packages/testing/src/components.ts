import { describe, isHidden, labelsFor, within } from "./dom.js";
import { REGISTRY, type RegistryComponent } from "./generated/registry.js";
import type { Run } from "./run.js";
import type { PatternName } from "./types.js";
import { PATTERNS } from "./patterns/index.js";

/**
 * How each Kernel component is checked. `anchor` is the class part of the
 * element a check starts from (`kernel-<folder>-<anchor>`), which both
 * packages emit identically; `patterns` are the APG patterns it implements;
 * `field` adds the form-field invariants (a real label stays in the DOM).
 * Components missing here still get the generic Kernel invariants.
 */
export interface ComponentSpec {
  anchor: string;
  patterns: PatternName[];
  field?: boolean;
}

export const COMPONENT_SPECS: Record<string, ComponentSpec> = {
  Accordion: { anchor: "accordion", patterns: ["accordion"] },
  AgentActivity: { anchor: "root", patterns: [] },
  Button: { anchor: "root", patterns: ["button"] },
  Checkbox: { anchor: "root", patterns: ["checkbox"] },
  ColorPicker: { anchor: "root", patterns: ["field"], field: true },
  Combobox: { anchor: "root", patterns: ["combobox"], field: true },
  CommandPalette: { anchor: "content", patterns: ["dialog", "combobox"] },
  ContextMenu: { anchor: "content", patterns: ["menu"] },
  DatePicker: { anchor: "root", patterns: ["grid"] },
  DateRangePicker: { anchor: "root", patterns: ["grid"] },
  Dialog: { anchor: "content", patterns: ["dialog"] },
  DropdownMenu: { anchor: "content", patterns: ["menu"] },
  FileDiff: { anchor: "root", patterns: [] },
  FileUpload: { anchor: "root", patterns: [] },
  HoverCard: { anchor: "content", patterns: [] },
  InputOTP: { anchor: "root", patterns: ["field"] },
  NavigationMenu: { anchor: "root", patterns: [] },
  NumberField: { anchor: "root", patterns: ["field"], field: true },
  Popover: { anchor: "content", patterns: ["disclosure"] },
  RadioGroup: { anchor: "root", patterns: ["radio-group"] },
  Reasoning: { anchor: "root", patterns: ["disclosure"] },
  Select: { anchor: "root", patterns: ["select"], field: true },
  Sheet: { anchor: "sheet", patterns: ["dialog"] },
  Slider: { anchor: "root", patterns: ["slider"], field: true },
  Switch: { anchor: "control", patterns: ["switch"] },
  Tabs: { anchor: "root", patterns: ["tabs"] },
  TagInput: { anchor: "root", patterns: ["field"], field: true },
  TextField: { anchor: "root", patterns: ["field"], field: true },
  Textarea: { anchor: "root", patterns: ["field"], field: true },
  Toggle: { anchor: "root", patterns: ["toggle-button"] },
  ToolCall: { anchor: "root", patterns: ["disclosure"] },
  Tooltip: { anchor: "content", patterns: ["tooltip"] },
};

/** Every Kernel component `checkComponent` knows, keyed by its primary React export. */
export const KERNEL_COMPONENTS: readonly RegistryComponent[] = REGISTRY;

/** Resolve "DropdownMenu", "Dropdown Menu", "dropdown-menu" or "kernel-dropdown-menu". */
export function resolveComponent(name: string): RegistryComponent | undefined {
  const key = name.toLowerCase().replace(/[^a-z]/g, "");
  return REGISTRY.find(
    (c) =>
      c.export.toLowerCase() === key ||
      c.folder.toLowerCase() === key ||
      c.name.toLowerCase().replace(/[^a-z]/g, "") === key ||
      c.slug.replace(/-/g, "") === key ||
      c.tag.replace(/-/g, "") === key,
  );
}

export function anchorSelector(component: RegistryComponent) {
  const spec = COMPONENT_SPECS[component.folder];
  return spec ? `.kernel-${component.folder}-${spec.anchor}` : `[class*="kernel-${component.folder}-"]`;
}

/** The outermost elements in `root` that belong to `component`. */
export function findAnchors(root: Element, component: RegistryComponent): Element[] {
  const spec = COMPONENT_SPECS[component.folder];
  if (spec) return within(root, anchorSelector(component));
  const prefix = `kernel-${component.folder}-`;
  const all = within(root, `[class*="${prefix}"]`).filter((el) => Array.from(el.classList).some((c) => c.startsWith(prefix)));
  return all.filter((el) => !all.some((other) => other !== el && other.contains(el)));
}

const FIELD_CONTROL = "input:not([type=hidden]):not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), select, textarea, [role=combobox]";
const CLICKABLE = "button, summary, [role=tab], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=option], [role=switch]";

/** Kernel's own promises, on top of the APG pattern. */
export async function checkKernelInvariants(run: Run, anchor: Element, component: RegistryComponent) {
  const spec = COMPONENT_SPECS[component.folder];

  if (spec?.field) {
    // The primary control keeps a real <label> (or a labelledby'd legend) in
    // the DOM; secondary controls (ColorPicker's hex field) may use aria-label.
    const controls = within(anchor, FIELD_CONTROL).filter((control) => {
      const popover = control.closest("[popover]");
      return !popover || popover === anchor;
    });
    const labelled = controls.filter((control) => labelsFor(control).length > 0 || control.hasAttribute("aria-labelledby"));
    if (controls.length) {
      run.expect(
        labelled.length > 0,
        "kernel/label-in-dom",
        `${component.export}'s control has no <label>. Kernel always renders a real label; hideLabel hides it visually (kernel-sr-only) and keeps it in the DOM.`,
        controls[0],
      );
    }
    for (const control of labelled) {
      for (const label of labelsFor(control)) {
        run.expect(
          !isHidden(label, anchor),
          "kernel/label-in-dom",
          `${component.export}'s <label> is hidden from assistive tech (${describe(label)}). Use hideLabel, which keeps it readable.`,
          label,
        );
      }
    }
  }

  // Decorative icons are aria-hidden; meaningful ones carry a name.
  for (const svg of within(anchor, "svg")) {
    if (svg.closest("[aria-hidden=true]")) continue;
    const labelled = svg.hasAttribute("aria-label") || svg.hasAttribute("aria-labelledby") || svg.querySelector(":scope > title");
    run.expect(Boolean(labelled), "kernel/decorative-svg", "An inline <svg> is neither aria-hidden nor labelled.", svg, "warning");
  }

  // "Anything you click needs user-select: none" — observable only with Kernel's CSS in a real browser.
  const win = anchor.ownerDocument.defaultView;
  const tokens = win?.getComputedStyle(anchor.ownerDocument.documentElement).getPropertyValue("--kernel-space-1").trim();
  if (!run.env.layout || !tokens) {
    run.skip("kernel/user-select-none", "environment", run.env.layout ? "Kernel's stylesheet isn't loaded on this page." : `${run.env.name} doesn't apply Kernel's CSS.`, anchor);
  } else {
    for (const el of within(anchor, CLICKABLE)) {
      if (isHidden(el)) continue;
      const s = win!.getComputedStyle(el);
      const value = s.userSelect || s.getPropertyValue("-webkit-user-select");
      run.expect(value === "none", "kernel/user-select-none", `Clickable ${describe(el)} has user-select: ${value || "auto"}; a double-click selects its label.`, el, "warning");
    }
  }
}

/** Patterns + Kernel invariants for one anchor. */
export async function checkAnchor(run: Run, anchor: Element, component: RegistryComponent, seen?: WeakMap<Element, Set<string>>) {
  const spec = COMPONENT_SPECS[component.folder];
  for (const pattern of spec?.patterns ?? []) {
    if (seen) {
      const done = seen.get(anchor) ?? new Set<string>();
      if (done.has(pattern)) continue;
      done.add(pattern);
      seen.set(anchor, done);
    }
    await PATTERNS[pattern](run, anchor);
  }
  await checkKernelInvariants(run, anchor, component);
}
