import type { EnvironmentName } from "./types.js";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

export interface Environment {
  name: EnvironmentName;
  /** Real layout: sizes, visibility from CSS, scrolling. jsdom and happy-dom have none. */
  layout: boolean;
  /** The Popover API (`showPopover`, `:popover-open`). */
  popover: boolean;
  /** A real modal `<dialog>`: focus moves in, the rest of the page goes inert. */
  modalDialog: boolean;
}

export function detectEnvironment(doc: Document): Environment {
  const win = doc.defaultView;
  const ua = win?.navigator?.userAgent ?? "";
  const name: EnvironmentName = /jsdom/i.test(ua) ? "jsdom" : /happy-?dom/i.test(ua) ? "happy-dom" : "browser";
  let popover = false;
  try {
    const probe = doc.createElement("div");
    if (typeof probe.showPopover === "function") {
      probe.matches(":popover-open"); // throws where the selector is unknown
      popover = true;
    }
  } catch {
    popover = false;
  }
  return { name, layout: name === "browser", popover, modalDialog: name === "browser" };
}

/* ------------------------------------------------------------------ */
/* Visibility and focus                                                */
/* ------------------------------------------------------------------ */

function style(el: Element): CSSStyleDeclaration | null {
  try {
    return el.ownerDocument.defaultView?.getComputedStyle(el) ?? null;
  } catch {
    return null;
  }
}

/**
 * Hidden from everyone: `hidden`, `aria-hidden="true"`, `display: none`,
 * `visibility: hidden`, or inside a closed `<details>`. With `boundary`, only
 * the ancestors below it count — so the items of a closed menu still have
 * names when the menu itself is the thing being checked.
 */
export function isHidden(el: Element, boundary: Element | null = null): boolean {
  for (let node: Element | null = el; node && node !== boundary; node = node.parentElement) {
    if (node.getAttribute("aria-hidden") === "true") return true;
    if (node.hasAttribute("hidden") && node.getAttribute("hidden") !== "until-found") return true;
    const s = style(node);
    if (s && s.display === "none") return true;
    const parent: HTMLElement | null = node.parentElement;
    if (parent?.tagName === "DETAILS" && parent !== boundary && !(parent as HTMLDetailsElement).open) {
      if (parent.querySelector(":scope > summary") !== node) return true;
    }
  }
  if (boundary) return false;
  const s = style(el);
  return Boolean(s && (s.visibility === "hidden" || s.visibility === "collapse"));
}

const NATIVELY_FOCUSABLE = "a[href], area[href], button, input:not([type=hidden]), select, textarea, iframe, summary, audio[controls], video[controls], [contenteditable]:not([contenteditable=false])";

export function isDisabled(el: Element): boolean {
  if ((el as HTMLButtonElement).disabled) return true;
  if (el.closest("fieldset:disabled")) {
    const legend = el.closest("fieldset")?.querySelector(":scope > legend");
    if (!legend?.contains(el)) return true;
  }
  return false;
}

export function isFocusable(el: Element): boolean {
  if (isDisabled(el) || el.closest("[inert]")) return false;
  if (el.tagName === "SUMMARY" && el.parentElement?.tagName === "DETAILS" && el.parentElement.querySelector(":scope > summary") !== el) return false;
  return el.matches(NATIVELY_FOCUSABLE) || el.hasAttribute("tabindex");
}

/** In the sequential (Tab key) focus order. */
export function isTabbable(el: Element): boolean {
  if (!isFocusable(el) || isHidden(el)) return false;
  return (el as HTMLElement).tabIndex >= 0;
}

export function focusableWithin(root: Element): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`${NATIVELY_FOCUSABLE}, [tabindex]`)).filter(isFocusable);
}

export function activeElement(doc: Document): Element | null {
  let active = doc.activeElement;
  while (active?.shadowRoot?.activeElement) active = active.shadowRoot.activeElement;
  return active;
}

const seenOpen = new WeakSet<Element>();

/**
 * Whether a popover-ish surface is currently shown. `null` when that can't be
 * known here (a `[popover]` element without the Popover API, in jsdom).
 */
export function isShown(el: Element, env: { popover: boolean }): boolean | null {
  if (el.hasAttribute("popover")) {
    if (env.popover) {
      try {
        return el.matches(":popover-open");
      } catch {
        return null;
      }
    }
    if (el.hasAttribute("hidden")) return false;
    const state = el.getAttribute("data-state");
    if (state === "open") return true;
    if (state === "closed") return false;
    if (el.hasAttribute("data-open")) {
      const open = el.getAttribute("data-open") !== "false";
      if (open) seenOpen.add(el);
      return open;
    }
    // Kernel (and most libraries) drop data-open on close rather than set it
    // to "false"; once an element has been seen open, its absence means closed.
    return seenOpen.has(el) ? false : null;
  }
  if (el.tagName === "DIALOG") return (el as HTMLDialogElement).open;
  if (el.tagName === "DETAILS") return (el as HTMLDetailsElement).open;
  return !isHidden(el);
}

/* ------------------------------------------------------------------ */
/* Roles                                                               */
/* ------------------------------------------------------------------ */

/** The explicit role, or the implicit one for the handful of elements the patterns care about. */
export function roleOf(el: Element): string {
  const explicit = el.getAttribute("role")?.trim().split(/\s+/)[0];
  if (explicit) return explicit;
  const tag = el.tagName.toLowerCase();
  switch (tag) {
    case "button":
      return "button";
    case "summary":
      return "button";
    case "a":
      return el.hasAttribute("href") ? "link" : "generic";
    case "select":
      return (el as HTMLSelectElement).multiple || (el as HTMLSelectElement).size > 1 ? "listbox" : "combobox";
    case "option":
      return "option";
    case "textarea":
      return "textbox";
    case "dialog":
      return "dialog";
    case "fieldset":
      return "group";
    case "table":
      return "table";
    case "td":
      return "cell";
    case "th":
      return "columnheader";
    case "tr":
      return "row";
    case "hr":
      return "separator";
    case "progress":
      return "progressbar";
    case "meter":
      return "meter";
    case "input": {
      const type = (el as HTMLInputElement).type;
      if (type === "checkbox") return el.hasAttribute("switch") ? "switch" : "checkbox";
      if (type === "radio") return "radio";
      if (type === "range") return "slider";
      if (type === "number") return "spinbutton";
      if (type === "button" || type === "submit" || type === "reset" || type === "image") return "button";
      if (el.hasAttribute("list")) return "combobox";
      return "textbox";
    }
    default:
      return "generic";
  }
}

/* ------------------------------------------------------------------ */
/* Accessible name (a subset of accname 1.2)                          */
/* ------------------------------------------------------------------ */

const NAME_FROM_CONTENT = new Set([
  "button", "cell", "checkbox", "columnheader", "gridcell", "heading", "link", "menuitem", "menuitemcheckbox",
  "menuitemradio", "option", "radio", "row", "rowheader", "switch", "tab", "tooltip", "treeitem", "legend",
]);

function byId(el: Element, id: string): Element | null {
  const root = el.getRootNode() as Document | ShadowRoot;
  return (root.getElementById?.(id) ?? el.ownerDocument.getElementById(id)) || null;
}

export function idRefs(el: Element, attr: string): { ids: string[]; found: Element[]; missing: string[] } {
  const ids = (el.getAttribute(attr) ?? "").trim().split(/\s+/).filter(Boolean);
  const found: Element[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const target = byId(el, id);
    if (target) found.push(target);
    else missing.push(id);
  }
  return { ids, found, missing };
}

const squash = (text: string) => text.replace(/\s+/g, " ").trim();

interface NameContext {
  visited: Set<Element>;
  /** Hidden-ness is judged below this element: the one whose name is being computed, or a labelledby target. */
  boundary: Element;
}

function textAlternative(el: Element, ctx: NameContext, referenced: boolean, embedded: boolean): string {
  const visited = ctx.visited;
  if (visited.has(el)) return "";
  visited.add(el);
  if (!referenced && el !== ctx.boundary && isHidden(el, ctx.boundary)) return "";

  // 2B: aria-labelledby (not followed when already inside a labelledby traversal).
  if (!embedded) {
    const { found } = idRefs(el, "aria-labelledby");
    if (found.length) {
      return squash(
        found.map((target) => textAlternative(target, { visited, boundary: target }, true, true)).join(" "),
      );
    }
  }

  // 2C: aria-label.
  const label = squash(el.getAttribute("aria-label") ?? "");
  if (label) return label;

  // 2D: native label sources.
  const native = nativeName(el, ctx);
  if (native) return native;

  // 2F: name from content.
  const role = roleOf(el);
  if (embedded || referenced || NAME_FROM_CONTENT.has(role) || el.tagName === "LABEL" || el.tagName === "LEGEND" || el.tagName === "SUMMARY") {
    const text = textFromContent(el, ctx);
    if (text) return text;
  }

  // 2I: tooltip attribute, then placeholder for text inputs.
  const title = squash(el.getAttribute("title") ?? "");
  if (title) return title;
  if (el.matches("input, textarea")) return squash(el.getAttribute("placeholder") ?? "");
  return "";
}

function nativeName(el: Element, ctx: NameContext): string {
  const tag = el.tagName;
  if (tag === "INPUT" || tag === "SELECT" || tag === "TEXTAREA" || tag === "METER" || tag === "PROGRESS" || tag === "OUTPUT") {
    const type = (el as HTMLInputElement).type;
    if (tag === "INPUT" && (type === "button" || type === "submit" || type === "reset")) {
      return squash((el as HTMLInputElement).value) || (type === "submit" ? "Submit" : type === "reset" ? "Reset" : "");
    }
    if (tag === "INPUT" && type === "image") return squash(el.getAttribute("alt") ?? "") || "Submit";
    const labels = labelsFor(el);
    if (labels.length) {
      return squash(
        labels.map((label) => textFromContent(label, { visited: ctx.visited, boundary: label }, el)).join(" "),
      );
    }
    return "";
  }
  if (tag === "BUTTON") {
    // A <button> is labelable: <label for> or a wrapping <label> names it before its content does.
    const labels = labelsFor(el).filter((label) => !el.contains(label));
    if (labels.length) {
      const text = squash(labels.map((label) => textFromContent(label, { visited: ctx.visited, boundary: label }, el)).join(" "));
      if (text) return text;
    }
    return "";
  }
  if (tag === "IMG" || tag === "AREA") return squash(el.getAttribute("alt") ?? "");
  if (tag === "FIELDSET") {
    const legend = el.querySelector(":scope > legend");
    return legend ? textFromContent(legend, ctx) : "";
  }
  if (tag === "TABLE") {
    const caption = el.querySelector(":scope > caption");
    return caption ? textFromContent(caption, ctx) : "";
  }
  if (tag === "FIGURE") {
    const caption = el.querySelector(":scope > figcaption");
    return caption ? textFromContent(caption, ctx) : "";
  }
  if (tag.toLowerCase() === "svg") {
    const title = el.querySelector(":scope > title");
    return title ? squash(title.textContent ?? "") : "";
  }
  return "";
}

export function labelsFor(el: Element): Element[] {
  const labels = (el as HTMLInputElement).labels;
  if (labels) return Array.from(labels);
  const found: Element[] = [];
  const id = el.getAttribute("id");
  if (id) {
    for (const label of Array.from(el.ownerDocument.querySelectorAll("label[for]"))) {
      if (label.getAttribute("for") === id) found.push(label);
    }
  }
  const wrapping = el.closest("label");
  if (wrapping && !found.includes(wrapping)) found.push(wrapping);
  return found;
}

function textFromContent(el: Element, ctx: NameContext, exclude?: Element): string {
  const parts: string[] = [];
  for (const child of Array.from(el.childNodes)) {
    if (child.nodeType === 3) {
      parts.push(child.textContent ?? "");
    } else if (child.nodeType === 1) {
      const element = child as Element;
      if (element === exclude) continue;
      if (isHidden(element, ctx.boundary)) continue;
      // An embedded control contributes its value, not its label.
      if (element.matches("input:not([type=checkbox]):not([type=radio]), textarea")) {
        parts.push((element as HTMLInputElement).value ?? "");
        continue;
      }
      if (element.tagName === "SELECT") {
        parts.push((element as HTMLSelectElement).selectedOptions?.[0]?.textContent ?? "");
        continue;
      }
      parts.push(" " + textAlternative(element, ctx, false, true) + " ");
    }
  }
  return squash(parts.join(""));
}

/** The element's accessible name: aria-labelledby, aria-label, `<label>`, `alt`, `<legend>`, `<caption>`, content, `title`. */
export function accessibleName(el: Element): string {
  return textAlternative(el, { visited: new Set(), boundary: el }, false, false);
}

/* ------------------------------------------------------------------ */
/* Reporting helpers                                                   */
/* ------------------------------------------------------------------ */

/** `button#id.kernel-Tabs-tab "Account"` — short enough for a failure message, serialisable across `page.evaluate`. */
export function describe(el: Element | null | undefined): string {
  if (!el) return "(none)";
  let out = el.tagName.toLowerCase();
  const id = el.getAttribute("id");
  if (id && !/^(:|_r_|«)/.test(id)) out += `#${id}`;
  const kernelClass = Array.from(el.classList).find((c) => c.startsWith("kernel-"));
  if (kernelClass) out += `.${kernelClass}`;
  const role = el.getAttribute("role");
  if (role) out += `[role=${role}]`;
  const text = squash(el.getAttribute("aria-label") ?? el.textContent ?? "").slice(0, 40);
  if (text) out += ` "${text}"`;
  return out;
}

/** Kernel's class names are `kernel-<Component>-<part>`; returns the component folder name. */
export function kernelComponentOf(el: Element): string | undefined {
  for (let node: Element | null = el; node; node = node.parentElement) {
    for (const cls of Array.from(node.classList)) {
      const match = /^kernel-([A-Z][A-Za-z]+)-/.exec(cls);
      if (match) return match[1];
    }
  }
  return undefined;
}

/** All elements in `root` (including `root`) matching `selector`. */
export function within(root: Element, selector: string): Element[] {
  const found = root.matches(selector) ? [root] : [];
  return found.concat(Array.from(root.querySelectorAll(selector)));
}
