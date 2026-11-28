/**
 * Reading the page the way assistive technology does: implicit roles from
 * HTML-AAM, a practical subset of the accessible name computation
 * (accname 1.2), states, and "is this rendered at all".
 */
import { KERNEL_COMPONENTS, KERNEL_TAGS } from "./components.generated.js";
import type { Checked } from "./types.js";

const MAX_NAME = 160;

export function normalize(text: string | null | undefined, max = MAX_NAME): string {
  const clean = (text ?? "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "NOSCRIPT", "HEAD", "META", "LINK", "DATALIST"]);

// ── Roles ────────────────────────────────────────────────────────────

const SECTIONING = "article, aside, main, nav, section";

function inputRole(input: HTMLInputElement): string | null {
  const type = (input.getAttribute("type") ?? "text").toLowerCase();
  switch (type) {
    case "hidden":
      return null;
    case "button":
    case "submit":
    case "reset":
    case "image":
    case "file":
      return "button";
    case "checkbox":
      return "checkbox";
    case "radio":
      return "radio";
    case "range":
      return "slider";
    case "number":
      return "spinbutton";
    case "search":
      return input.hasAttribute("list") ? "combobox" : "searchbox";
    case "color":
    case "date":
    case "datetime-local":
    case "month":
    case "time":
    case "week":
      return "textbox";
    default:
      return input.hasAttribute("list") ? "combobox" : "textbox";
  }
}

/** The element's role: explicit `role` first, then the implicit one. */
export function roleOf(el: Element): string | null {
  const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0];
  if (explicit && explicit !== "none" && explicit !== "presentation") return explicit;
  if (explicit) return null;
  const tag = el.tagName;
  switch (tag) {
    case "A":
    case "AREA":
      return el.hasAttribute("href") ? "link" : null;
    case "BUTTON":
      return "button";
    case "INPUT":
      return inputRole(el as HTMLInputElement);
    case "TEXTAREA":
      return "textbox";
    case "SELECT": {
      const select = el as HTMLSelectElement;
      return select.multiple || select.size > 1 ? "listbox" : "combobox";
    }
    case "OPTION":
      return el.closest("select, datalist") ? null : "option";
    case "SUMMARY":
      return isDetailsSummary(el) ? "button" : null;
    case "DIALOG":
      return "dialog";
    case "H1":
    case "H2":
    case "H3":
    case "H4":
    case "H5":
    case "H6":
      return "heading";
    case "NAV":
      return "navigation";
    case "MAIN":
      return "main";
    case "ASIDE":
      return "complementary";
    case "SEARCH":
      return "search";
    case "HEADER":
      return el.parentElement?.closest(SECTIONING) ? null : "banner";
    case "FOOTER":
      return el.parentElement?.closest(SECTIONING) ? null : "contentinfo";
    case "SECTION":
      return hasOwnLabel(el) ? "region" : null;
    case "FORM":
      return "form";
    case "FIELDSET":
      return "group";
    case "OUTPUT":
      return "status";
    case "PROGRESS":
      return "progressbar";
    case "METER":
      return "meter";
    default:
      if (isEditableHost(el)) return "textbox";
      return null;
  }
}

/** An element that is itself `contenteditable` (not merely inside one). */
export function isEditableHost(el: Element): boolean {
  const value = el.getAttribute("contenteditable");
  return value !== null && value.toLowerCase() !== "false";
}

export function isDetailsSummary(el: Element): boolean {
  const details = el.parentElement;
  return details?.tagName === "DETAILS" && details.querySelector(":scope > summary") === el;
}

function hasOwnLabel(el: Element): boolean {
  return Boolean(el.getAttribute("aria-label")?.trim() || el.getAttribute("aria-labelledby")?.trim());
}

/** Roles an agent can operate, so they get a ref. */
export const ACTIONABLE_ROLES = new Set([
  "button",
  "link",
  "textbox",
  "searchbox",
  "checkbox",
  "radio",
  "switch",
  "combobox",
  "listbox",
  "option",
  "slider",
  "spinbutton",
  "tab",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "treeitem",
  "dialog",
  "alertdialog",
  "form",
  "gridcell",
]);

/** Roles kept for context even though they can't be operated. */
export const CONTEXT_ROLES = new Set([
  "heading",
  "banner",
  "navigation",
  "main",
  "complementary",
  "contentinfo",
  "region",
  "search",
  "group",
  "radiogroup",
  "tablist",
  "tabpanel",
  "menu",
  "menubar",
  "toolbar",
  "tree",
  "grid",
  "alert",
  "status",
  "log",
  "progressbar",
  "meter",
]);

// Containers whose name is only worth showing when an author gave one.
const NAME_REQUIRED = new Set(["group", "region", "form", "toolbar", "tabpanel"]);

export function isContextWorthy(el: Element, role: string, name: string): boolean {
  if (NAME_REQUIRED.has(role) && role !== "form") return Boolean(name);
  return true;
}

// ── Visibility ───────────────────────────────────────────────────────

export function isPopoverOpen(el: Element): boolean {
  try {
    return el.matches(":popover-open");
  } catch {
    // No popover support (older browsers, jsdom): fall back to rendering.
    return getComputedStyle(el).display !== "none";
  }
}

/** True when this element (not counting ancestors) hides itself and its
 * subtree from users: `hidden`, `inert`, `aria-hidden`, a closed dialog or
 * popover, content of a closed `<details>`, or `display: none` /
 * `visibility: hidden`. */
export function hidesSubtree(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  if (el.hasAttribute("hidden")) return true;
  if (el.hasAttribute("inert")) return true;
  if (el.getAttribute("aria-hidden") === "true") return true;
  if (el.tagName === "DIALOG" && !(el as HTMLDialogElement).open) return true;
  if (el.hasAttribute("popover") && !isPopoverOpen(el)) return true;
  const parent = el.parentElement;
  if (parent?.tagName === "DETAILS" && !(parent as HTMLDetailsElement).open && !isDetailsSummary(el)) return true;
  const view = el.ownerDocument.defaultView;
  if (view) {
    const style = view.getComputedStyle(el);
    if (style.display === "none") return true;
    if (style.visibility === "hidden" || style.visibility === "collapse") return true;
  }
  return false;
}

/** True when the element, or anything above it up to `root`, is hidden. */
export function isHidden(el: Element, root: Element): boolean {
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (hidesSubtree(node)) return true;
    if (node === root) break;
  }
  return false;
}

// ── Accessible name ──────────────────────────────────────────────────

const NAME_FROM_CONTENT = new Set([
  "button",
  "link",
  "heading",
  "tab",
  "option",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "treeitem",
  "checkbox",
  "radio",
  "switch",
  "cell",
  "gridcell",
  "columnheader",
  "rowheader",
  "tooltip",
  "row",
]);

function byIds(el: Element, attr: string): Element[] {
  const ids = el.getAttribute(attr)?.trim();
  if (!ids) return [];
  const doc = el.ownerDocument;
  return ids
    .split(/\s+/)
    .map((id) => doc.getElementById(id))
    .filter((node): node is HTMLElement => node !== null);
}

function isEmbeddedControl(el: Element): boolean {
  return ["INPUT", "SELECT", "TEXTAREA"].includes(el.tagName) || ["textbox", "combobox", "listbox", "slider", "spinbutton"].includes(el.getAttribute("role") ?? "");
}

function controlValueText(el: Element): string {
  if (el.tagName === "SELECT") {
    const select = el as HTMLSelectElement;
    return select.selectedOptions[0]?.textContent ?? "";
  }
  if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") return (el as HTMLInputElement).value;
  return el.getAttribute("aria-valuetext") ?? el.getAttribute("aria-valuenow") ?? el.textContent ?? "";
}

/** Text of a subtree as it would be read: hidden parts skipped, images
 * read by alt text, nested controls by their value. */
function textFrom(node: Node, visited: Set<Node>, skipHidden: boolean, exclude?: Element): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const el = node as Element;
  if (el === exclude || visited.has(el)) return "";
  visited.add(el);
  if (skipHidden && hidesSubtree(el)) return "";
  const label = el.getAttribute("aria-label")?.trim();
  const labelledby = byIds(el, "aria-labelledby");
  if (labelledby.length) return labelledby.map((ref) => textFrom(ref, visited, false)).join(" ");
  if (label) return label;
  if (isEmbeddedControl(el)) return controlValueText(el);
  if (el.tagName === "IMG" || (el.tagName === "INPUT" && (el as HTMLInputElement).type === "image")) return el.getAttribute("alt") ?? "";
  if (el.tagName === "svg" || el.tagName === "SVG") return el.querySelector("title")?.textContent ?? "";
  const display = el.ownerDocument.defaultView?.getComputedStyle(el).display ?? "inline";
  const inner = Array.from(el.childNodes)
    .map((child) => textFrom(child, visited, skipHidden, exclude))
    .join("");
  const text = inner.trim() ? inner : el.getAttribute("title") ?? "";
  // Block-level boundaries read as word breaks.
  return display === "inline" || display === "contents" ? text : ` ${text} `;
}

function labelsOf(el: Element): Element[] {
  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length) return Array.from(labels);
  const id = el.id;
  const found: Element[] = [];
  if (id) {
    for (const label of Array.from(el.ownerDocument.querySelectorAll(`label[for="${cssEscape(id)}"]`))) found.push(label);
  }
  const wrapping = el.closest("label");
  if (wrapping && !found.includes(wrapping)) found.push(wrapping);
  return found;
}

function cssEscape(value: string): string {
  return typeof CSS !== "undefined" && CSS.escape ? CSS.escape(value) : value.replace(/["\\]/g, "\\$&");
}

const LABELABLE = new Set(["INPUT", "SELECT", "TEXTAREA", "BUTTON", "METER", "PROGRESS", "OUTPUT"]);

/** The accessible name: aria-labelledby, aria-label, native labelling
 * (`<label for>`, a wrapping label, alt, legend, caption, button value),
 * content for roles named by their content, then title and placeholder. */
export function accessibleName(el: Element, role: string | null = roleOf(el)): string {
  const visited = new Set<Node>([el]);
  const labelledby = byIds(el, "aria-labelledby");
  if (labelledby.length) {
    return normalize(labelledby.map((ref) => (ref === el ? textOfSelf(el) : textFrom(ref, visited, false))).join(" "));
  }
  const ariaLabel = el.getAttribute("aria-label")?.trim();
  if (ariaLabel) return normalize(ariaLabel);

  const tag = el.tagName;
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    const type = input.type;
    if (type === "image") return normalize(input.alt || input.value || "Submit");
  }
  if (LABELABLE.has(tag)) {
    const labels = labelsOf(el);
    if (labels.length) {
      const text = normalize(labels.map((label) => textFrom(label, visited, true, el)).join(" "));
      if (text) return text;
    }
  }
  if (tag === "INPUT") {
    const input = el as HTMLInputElement;
    if (["button", "submit", "reset"].includes(input.type)) {
      return normalize(input.value || (input.type === "submit" ? "Submit" : input.type === "reset" ? "Reset" : ""));
    }
  }
  if (tag === "IMG" || tag === "AREA") return normalize(el.getAttribute("alt"));
  if (tag === "FIELDSET") {
    const legend = el.querySelector(":scope > legend");
    if (legend) return normalize(textFrom(legend, visited, true));
  }
  if (tag === "TABLE") {
    const caption = el.querySelector(":scope > caption");
    if (caption) return normalize(textFrom(caption, visited, true));
  }
  if (tag === "FIGURE") {
    const caption = el.querySelector(":scope > figcaption");
    if (caption) return normalize(textFrom(caption, visited, true));
  }
  if (role && NAME_FROM_CONTENT.has(role)) {
    const text = normalize(textOfSelf(el));
    if (text) return text;
  }
  const title = el.getAttribute("title")?.trim();
  if (title) return normalize(title);
  const placeholder = el.getAttribute("placeholder") ?? el.getAttribute("aria-placeholder");
  if (placeholder) return normalize(placeholder);
  return "";
}

function textOfSelf(el: Element): string {
  return Array.from(el.childNodes)
    .map((child) => textFrom(child, new Set([el]), true))
    .join("");
}

export function accessibleDescription(el: Element): string {
  const refs = byIds(el, "aria-describedby");
  if (refs.length) return normalize(refs.map((ref) => textFrom(ref, new Set(), false)).join(" "), 240);
  const description = el.getAttribute("aria-description");
  return normalize(description, 240);
}

/** Visible text of a live region or other container, hidden parts skipped. */
export function visibleText(el: Element, max = 240): string {
  return normalize(textOfSelf(el), max);
}

// ── States ───────────────────────────────────────────────────────────

function ariaBool(el: Element, attr: string): boolean | undefined {
  const value = el.getAttribute(attr);
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function ariaTristate(el: Element, attr: string): Checked | undefined {
  const value = el.getAttribute(attr);
  if (value === "mixed") return "mixed";
  return ariaBool(el, attr);
}

export function checkedState(el: Element, role: string): Checked | undefined {
  if (el.tagName === "INPUT") {
    const input = el as HTMLInputElement;
    if (input.type === "checkbox" || input.type === "radio") {
      if (input.indeterminate) return "mixed";
      return input.checked;
    }
  }
  if (["checkbox", "radio", "switch", "menuitemcheckbox", "menuitemradio", "option", "treeitem"].includes(role)) {
    const state = ariaTristate(el, "aria-checked");
    if (state !== undefined) return state;
    if (role === "checkbox" || role === "radio" || role === "switch") return false;
  }
  return undefined;
}

export function expandedState(el: Element): boolean | undefined {
  if (el.tagName === "SUMMARY" && isDetailsSummary(el)) return (el.parentElement as HTMLDetailsElement).open;
  const aria = ariaBool(el, "aria-expanded");
  if (aria !== undefined) return aria;
  const popover = popoverTargetOf(el);
  if (popover) return isPopoverOpen(popover);
  return undefined;
}

/** The popover or dialog an invoker button controls, via `popovertarget`
 * or `commandfor`. */
export function popoverTargetOf(el: Element): Element | null {
  const id = el.getAttribute("popovertarget") ?? el.getAttribute("commandfor");
  if (!id) return null;
  return el.ownerDocument.getElementById(id);
}

export function isDisabled(el: Element): boolean {
  try {
    if (el.matches(":disabled")) return true;
  } catch {
    /* non-form element in an old engine */
  }
  return Boolean(el.closest('[aria-disabled="true"]'));
}

export function isInvalid(el: Element): boolean {
  const aria = el.getAttribute("aria-invalid");
  return aria !== null && aria !== "false";
}

export function isRequired(el: Element): boolean {
  return el.hasAttribute("required") || el.getAttribute("aria-required") === "true";
}

export function isReadOnly(el: Element): boolean {
  if ((el.tagName === "INPUT" || el.tagName === "TEXTAREA") && (el as HTMLInputElement).readOnly) return true;
  return el.getAttribute("aria-readonly") === "true";
}

// ── Kernel components ────────────────────────────────────────────────

const CLASS_PATTERN = /^kernel-([A-Za-z0-9]+)-/;

function componentFromClasses(el: Element): string | undefined {
  for (const cls of Array.from(el.classList)) {
    const match = CLASS_PATTERN.exec(cls);
    if (match && KERNEL_COMPONENTS.has(match[1]!)) return match[1];
  }
  return undefined;
}

/** Names the Kernel component a node belongs to: its own `kernel-<Name>-*`
 * class, else a wrapper's within two levels (a TextField's input sits in its
 * root), else the nearest `kernel-*` custom element host. */
export function kernelComponentOf(el: Element): string | undefined {
  const own = componentFromClasses(el);
  if (own) return own;
  let node = el.parentElement;
  for (let depth = 0; node && depth < 2; depth++, node = node.parentElement) {
    // Stop at a wrapper that is itself something else interactive.
    if (node.matches("button, a[href], input, select, textarea, dialog, form, details")) break;
    const found = componentFromClasses(node);
    if (found) return found;
  }
  const tag = el.tagName.toLowerCase();
  if (KERNEL_TAGS[tag]) return KERNEL_TAGS[tag];
  for (let host = el.parentElement; host; host = host.parentElement) {
    const name = KERNEL_TAGS[host.tagName.toLowerCase()];
    if (name) return name;
  }
  return undefined;
}

// ── Redaction ────────────────────────────────────────────────────────

const SECRET_AUTOCOMPLETE = /\b(one-time-code|current-password|new-password|cc-number|cc-csc|cc-exp(-month|-year)?|cc-name|cc-type)\b/;

/** True when a field's value must never reach a model: passwords, one-time
 * codes, card details, or anything marked `data-kernel-agent-redact`. */
export function isSecretField(el: Element): boolean {
  if (el.closest("[data-kernel-agent-redact]")) return true;
  if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "password") return true;
  const autocomplete = el.getAttribute("autocomplete") ?? "";
  return SECRET_AUTOCOMPLETE.test(autocomplete.toLowerCase());
}
