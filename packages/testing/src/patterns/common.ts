import { accessibleName, idRefs, isFocusable, isHidden, roleOf, within } from "../dom.js";
import type { Run } from "../run.js";

export type PatternCheck = (run: Run, root: Element) => Promise<void>;

const IDREF_ATTRS = [
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-owns",
  "aria-activedescendant",
  "aria-errormessage",
  "aria-details",
  "aria-flowto",
  "popovertarget",
  "commandfor",
  "interestfor",
  "for",
  "list",
];

/** Every id reference on `el` points at an element that exists. */
export function checkRefs(run: Run, prefix: string, el: Element, attrs: string[] = IDREF_ATTRS) {
  for (const attr of attrs) {
    if (!el.hasAttribute(attr)) continue;
    if (attr === "for" && el.tagName !== "LABEL" && el.tagName !== "OUTPUT") continue;
    const { missing, ids } = idRefs(el, attr);
    if (ids.length === 0) continue;
    run.expect(
      missing.length === 0,
      `${prefix}/idrefs`,
      `${attr}="${el.getAttribute(attr)}" points at ${missing.map((id) => `#${id}`).join(", ")}, which doesn't exist.`,
      el,
    );
  }
}

/** Fails when `el` has no accessible name. Returns the name. */
export function requireName(run: Run, rule: string, el: Element, what: string, severity: "error" | "warning" = "error") {
  const name = accessibleName(el);
  run.expect(
    name.length > 0,
    rule,
    `${what} has no accessible name. Give it visible text, a <label>, aria-labelledby or aria-label.`,
    el,
    severity,
  );
  return name;
}

export function noInstances(run: Run, pattern: string, what: string, root: Element) {
  run.fail(`${pattern}/present`, `No ${what} found in the given root.`, root);
}

const INTERACTIVE =
  "a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=link], [role=checkbox], [role=switch], [role=radio], [role=tab], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=option], [role=slider], [role=spinbutton], [role=combobox], [role=textbox], [role=searchbox], [role=treeitem]";

/**
 * Rules every composed UI should pass, whatever it's built from: ids are
 * unique, id references resolve, interactive elements have names and aren't
 * nested inside each other, and nothing uses a positive tabindex.
 */
export function checkCommon(run: Run, root: Element) {
  const ids = new Map<string, Element[]>();
  for (const el of within(root, "[id]")) {
    const id = el.getAttribute("id")!;
    ids.set(id, [...(ids.get(id) ?? []), el]);
  }
  let duplicates = 0;
  for (const [id, els] of ids) {
    if (els.length > 1) {
      duplicates++;
      run.fail("common/unique-ids", `id="${id}" is used by ${els.length} elements; id references resolve to the first one only.`, els[1]);
    }
  }
  if (!duplicates) run.pass("common/unique-ids");

  for (const el of within(root, IDREF_ATTRS.map((attr) => `[${attr}]`).join(", "))) checkRefs(run, "common", el);

  for (const el of within(root, INTERACTIVE)) {
    if (isHidden(el) || (el as HTMLElement).closest("[inert]")) continue;
    // A <summary> inside a <details> that isn't its first summary is inert content.
    const role = roleOf(el);
    if (role === "option" && el.tagName === "OPTION") continue;
    requireName(run, "common/interactive-name", el, `This ${role}`);
    const parent = el.parentElement?.closest(INTERACTIVE);
    if (parent && !(parent.tagName === "LABEL") && !(role === "option" || roleOf(parent) === "combobox" || roleOf(parent) === "listbox")) {
      run.fail(
        "common/no-nested-interactive",
        `A ${role} is nested inside a ${roleOf(parent)} (${parent.tagName.toLowerCase()}). Nested interactive content is invalid HTML and unreliable with assistive tech.`,
        el,
      );
    }
  }

  for (const el of within(root, "[tabindex]")) {
    const value = Number(el.getAttribute("tabindex"));
    if (value > 0 && isFocusable(el)) {
      run.warn("common/no-positive-tabindex", `tabindex="${value}" reorders the page's focus sequence; use 0 or -1.`, el);
    }
  }
}
