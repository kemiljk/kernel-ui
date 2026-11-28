import {
  ACTIONABLE_ROLES,
  CONTEXT_ROLES,
  accessibleDescription,
  accessibleName,
  checkedState,
  expandedState,
  hidesSubtree,
  isContextWorthy,
  isDisabled,
  isEditableHost,
  isInvalid,
  isReadOnly,
  isRequired,
  isSecretField,
  kernelComponentOf,
  normalize,
  roleOf,
  visibleText,
} from "./dom.js";
import type { ElementFilter, Snapshot, SnapshotDiff, SnapshotNode, SnapshotOption } from "./types.js";

export const REDACTED = "[redacted]";
const MAX_OPTIONS = 50;

/** Hands out a stable ref per element for as long as the element lives.
 * Backed by a WeakMap, so the DOM is never touched and a removed element
 * can be garbage-collected. */
export class RefRegistry {
  private next = 1;
  private readonly byElement = new WeakMap<Element, string>();
  private readonly byRef = new Map<string, WeakRef<Element> | Element>();

  refFor(el: Element): string {
    let ref = this.byElement.get(el);
    if (!ref) {
      ref = `e${this.next++}`;
      this.byElement.set(el, ref);
      this.byRef.set(ref, typeof WeakRef === "function" ? new WeakRef(el) : el);
    }
    return ref;
  }

  peek(el: Element): string | undefined {
    return this.byElement.get(el);
  }

  resolve(ref: string): Element | null {
    const entry = this.byRef.get(ref);
    if (!entry) return null;
    const el = entry instanceof Element ? entry : entry.deref();
    if (!el || !el.isConnected) {
      this.byRef.delete(ref);
      return null;
    }
    return el;
  }
}

export function matchesFilter(el: Element, filter: ElementFilter | undefined): boolean {
  if (!filter) return false;
  if (typeof filter === "function") return filter(el);
  try {
    return el.matches(filter);
  } catch {
    return false;
  }
}

export interface WalkOptions {
  root: Element;
  refs: RefRegistry;
  include?: ElementFilter;
  exclude?: ElementFilter;
  maxNodes: number;
  /** Fills a Map from ref → element for the nodes in this snapshot. */
  elements?: Map<string, Element>;
}

export function isExcluded(el: Element, exclude: ElementFilter | undefined): boolean {
  return el.hasAttribute("data-kernel-agent-ignore") || matchesFilter(el, exclude);
}

function insideIncluded(el: Element, root: Element, include: ElementFilter | undefined): boolean {
  if (!include) return true;
  for (let node: Element | null = el; node; node = node.parentElement) {
    if (matchesFilter(node, include)) return true;
    if (node === root) break;
  }
  return false;
}

function optionsOf(select: HTMLSelectElement): { options: SnapshotOption[]; more: number } {
  const all = Array.from(select.options);
  const options = all.slice(0, MAX_OPTIONS).map((option) => {
    const entry: SnapshotOption = { value: option.value, label: normalize(option.label || option.textContent) };
    if (option.selected) entry.selected = true;
    if (option.disabled) entry.disabled = true;
    return entry;
  });
  return { options, more: Math.max(0, all.length - MAX_OPTIONS) };
}

/** Builds the snapshot node for one element, or null if it isn't worth
 * showing. Doesn't look at children. */
export function describe(el: Element, opts: Pick<WalkOptions, "root" | "refs" | "include">): SnapshotNode | null {
  const role = roleOf(el);
  if (!role) return null;
  const actionable = ACTIONABLE_ROLES.has(role);
  if (!actionable && !CONTEXT_ROLES.has(role)) return null;
  const name = accessibleName(el, role);
  if (!actionable && !isContextWorthy(el, role, name)) return null;
  if ((role === "alert" || role === "status" || role === "log") && !visibleText(el)) return null;

  const node: SnapshotNode = { role };
  if (name) node.name = name;
  if (actionable && insideIncluded(el, opts.root, opts.include)) node.ref = opts.refs.refFor(el);
  const component = kernelComponentOf(el);
  if (component) node.component = component;
  const description = accessibleDescription(el);
  if (description && description !== name) node.description = description;

  const tag = el.tagName;
  if (role === "heading") {
    const level = el.getAttribute("aria-level") ?? (/^H([1-6])$/.exec(tag)?.[1] ?? "2");
    node.level = Number(level);
  }
  if (role === "link") {
    const href = el.getAttribute("href");
    if (href) node.href = href;
  }
  if (role === "alert" || role === "status" || role === "log") {
    const text = visibleText(el);
    if (text !== name) node.text = text;
  }

  // Values.
  if (tag === "INPUT" || tag === "TEXTAREA") {
    const input = el as HTMLInputElement;
    const type = tag === "INPUT" ? input.type : "textarea";
    if (tag === "TEXTAREA") node.multiline = true;
    if (!["checkbox", "radio", "button", "submit", "reset", "image", "file"].includes(type)) {
      if (isSecretField(el)) {
        node.value = input.value ? REDACTED : "";
        node.redacted = true;
      } else {
        node.value = input.value;
      }
      const placeholder = input.getAttribute("placeholder");
      if (placeholder && placeholder !== name) node.placeholder = placeholder;
    }
    if (tag === "INPUT" && !["text", "checkbox", "radio", "button", "submit", "reset"].includes(type)) node.inputType = type;
    if (type === "range" || type === "number" || type === "date") {
      if (input.min) node.min = input.min;
      if (input.max) node.max = input.max;
    }
  } else if (tag === "SELECT") {
    const select = el as HTMLSelectElement;
    const { options, more } = optionsOf(select);
    if (select.multiple) node.multiselectable = true;
    else node.value = normalize(select.selectedOptions[0]?.label ?? select.selectedOptions[0]?.textContent ?? "");
    node.options = options;
    if (more) node.moreOptions = more;
  } else if (isEditableHost(el)) {
    node.multiline = true;
    node.value = isSecretField(el) ? REDACTED : normalize(el.textContent, 2000);
  } else if (["slider", "spinbutton", "progressbar", "meter", "combobox", "textbox", "searchbox"].includes(role)) {
    const valueText = el.getAttribute("aria-valuetext") ?? el.getAttribute("aria-valuenow");
    if (valueText !== null) node.value = valueText;
    if (tag === "PROGRESS" || tag === "METER") node.value = String((el as HTMLProgressElement).value);
    const min = el.getAttribute("aria-valuemin");
    const max = el.getAttribute("aria-valuemax");
    if (min !== null) node.min = min;
    if (max !== null) node.max = max;
  }

  // States.
  const checked = checkedState(el, role);
  if (checked !== undefined) node.checked = checked;
  const selected = el.getAttribute("aria-selected");
  if (selected === "true") node.selected = true;
  else if (selected === "false" && (role === "tab" || role === "option")) node.selected = false;
  const expanded = expandedState(el);
  if (expanded !== undefined) node.expanded = expanded;
  const pressed = el.getAttribute("aria-pressed");
  if (pressed === "true") node.pressed = true;
  else if (pressed === "false") node.pressed = false;
  else if (pressed === "mixed") node.pressed = "mixed";
  if (actionable && isDisabled(el)) node.disabled = true;
  if (isInvalid(el)) node.invalid = true;
  if (isRequired(el)) node.required = true;
  if (isReadOnly(el)) node.readonly = true;
  if (el.getAttribute("aria-multiselectable") === "true") node.multiselectable = true;
  if (el.ownerDocument.activeElement === el && node.ref) node.focused = true;
  return node;
}

/** Walks the tree under root, pruning hidden and excluded subtrees, and
 * keeps the nodes an agent needs: actionable controls plus the landmarks,
 * headings and live regions that give them context. Everything else is
 * flattened away, so its kept descendants move up to the nearest kept
 * ancestor. */
export function walk(opts: WalkOptions): Snapshot {
  const { root, maxNodes } = opts;
  let count = 0;
  let refs = 0;
  let truncated = false;
  let focused: string | undefined;

  // Open shadow roots (custom elements that use them) are part of what a
  // person sees, so their content comes first, then the light children.
  const childrenOf = (el: Element): Element[] => {
    const shadow = (el as HTMLElement).shadowRoot;
    const light = Array.from(el.children);
    return shadow ? [...Array.from(shadow.children), ...light] : light;
  };

  const visit = (el: Element, out: SnapshotNode[]) => {
    for (const child of childrenOf(el)) {
      if (count >= maxNodes) {
        truncated = true;
        return;
      }
      if (isExcluded(child, opts.exclude) || hidesSubtree(child)) continue;
      const node = describe(child, opts);
      // A native select's options are already in `options`.
      const leaf = child.tagName === "SELECT" || child.tagName === "OPTION" || child.tagName.toLowerCase() === "svg";
      if (!node) {
        if (!leaf) visit(child, out);
        continue;
      }
      count++;
      if (node.ref) {
        refs++;
        opts.elements?.set(node.ref, child);
        if (node.focused) focused = node.ref;
      }
      out.push(node);
      if (!leaf) {
        const children: SnapshotNode[] = [];
        visit(child, children);
        if (children.length) node.children = children;
      }
    }
  };

  const nodes: SnapshotNode[] = [];
  visit(root, nodes);
  const doc = root.ownerDocument;
  const snapshot: Snapshot = {
    url: doc.defaultView?.location.href ?? "",
    title: doc.title,
    nodes,
    refs,
  };
  if (focused) snapshot.focused = focused;
  if (truncated) snapshot.truncated = true;
  return snapshot;
}

/** Every node in the tree, depth first. */
export function flatten(nodes: SnapshotNode[], out: SnapshotNode[] = []): SnapshotNode[] {
  for (const node of nodes) {
    out.push(node);
    if (node.children) flatten(node.children, out);
  }
  return out;
}

function withoutChildren(node: SnapshotNode): SnapshotNode {
  const { children: _children, ...rest } = node;
  return rest;
}

const COMPARED: (keyof SnapshotNode)[] = [
  "name",
  "value",
  "checked",
  "selected",
  "expanded",
  "pressed",
  "disabled",
  "invalid",
  "description",
  "text",
  "focused",
];

/** What changed between two snapshots, by ref. Nodes without a ref (live
 * regions, headings) are reported as added when they're new. */
export function diffSnapshots(before: Snapshot, after: Snapshot): SnapshotDiff {
  const index = (snapshot: Snapshot) => {
    const byRef = new Map<string, SnapshotNode>();
    const unref = new Set<string>();
    for (const node of flatten(snapshot.nodes)) {
      if (node.ref) byRef.set(node.ref, node);
      else unref.add(`${node.role}|${node.name ?? ""}|${node.text ?? ""}`);
    }
    return { byRef, unref };
  };
  const a = index(before);
  const b = index(after);
  const diff: SnapshotDiff = { added: [], removed: [], changed: [] };
  for (const [ref, node] of b.byRef) {
    const old = a.byRef.get(ref);
    if (!old) {
      diff.added.push(withoutChildren(node));
      continue;
    }
    const changes: Record<string, [unknown, unknown]> = {};
    for (const key of COMPARED) {
      if (JSON.stringify(old[key]) !== JSON.stringify(node[key])) changes[key] = [old[key], node[key]];
    }
    if (Object.keys(changes).length) {
      const change = { ref, role: node.role, changes } as SnapshotDiff["changed"][number];
      if (node.name) change.name = node.name;
      diff.changed.push(change);
    }
  }
  for (const [ref, node] of a.byRef) {
    if (!b.byRef.has(ref)) diff.removed.push(node.name ? { ref, role: node.role, name: node.name } : { ref, role: node.role });
  }
  for (const node of flatten(after.nodes)) {
    if (node.ref) continue;
    const key = `${node.role}|${node.name ?? ""}|${node.text ?? ""}`;
    if (!a.unref.has(key) && (node.role === "alert" || node.role === "status" || node.role === "log" || node.role === "heading")) {
      diff.added.push(withoutChildren(node));
    }
  }
  return diff;
}

function quote(value: string): string {
  return JSON.stringify(value);
}

/** Renders a snapshot as an indented outline, about a third the tokens of
 * the JSON:
 *
 * ```
 * - form "Profile" [ref=e1]
 *   - textbox "Name" [ref=e2] value="Ada" required (TextField)
 *   - switch "Email me updates" [ref=e3] checked=false (Switch)
 * ```
 */
export function formatSnapshot(snapshot: Snapshot): string {
  const lines: string[] = [];
  const line = (node: SnapshotNode, depth: number) => {
    const parts = [`${"  ".repeat(depth)}- ${node.role}`];
    if (node.name) parts.push(quote(node.name));
    if (node.ref) parts.push(`[ref=${node.ref}]`);
    if (node.level) parts.push(`[level=${node.level}]`);
    if (node.value !== undefined) parts.push(`value=${quote(node.value)}`);
    if (node.text) parts.push(`text=${quote(node.text)}`);
    if (node.placeholder) parts.push(`placeholder=${quote(node.placeholder)}`);
    if (node.inputType) parts.push(`type=${node.inputType}`);
    for (const key of ["checked", "selected", "expanded", "pressed"] as const) {
      if (node[key] !== undefined) parts.push(`${key}=${node[key]}`);
    }
    for (const key of ["disabled", "invalid", "required", "readonly", "focused", "multiselectable"] as const) {
      if (node[key]) parts.push(key);
    }
    if (node.min !== undefined) parts.push(`min=${node.min}`);
    if (node.max !== undefined) parts.push(`max=${node.max}`);
    if (node.href) parts.push(`href=${quote(node.href)}`);
    if (node.options) {
      parts.push(`options=[${node.options.map((o) => quote(o.label)).join(", ")}${node.moreOptions ? `, …${node.moreOptions} more` : ""}]`);
    }
    if (node.description) parts.push(`description=${quote(node.description)}`);
    if (node.component) parts.push(`(${node.component})`);
    lines.push(parts.join(" "));
    for (const child of node.children ?? []) line(child, depth + 1);
  };
  for (const node of snapshot.nodes) line(node, 0);
  if (snapshot.truncated) lines.push("… (truncated: raise maxNodes or narrow root)");
  return lines.join("\n");
}
