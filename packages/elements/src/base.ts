/**
 * Shared machinery for Kernel's custom elements. Deliberately not a
 * rendering engine: no virtual DOM, no diffing. Each element owns one
 * real native child (a real `<button>`, `<hr>`, `<nav>`, ...) and syncs
 * attributes onto it imperatively — the same way the browser's own
 * built-in elements work internally, and the same "real elements, not
 * div soup" principle `@kernelui-lib/react` is built on.
 *
 * Light DOM only: nothing here calls `attachShadow()`. Kernel's whole
 * CSS architecture is one token cascade reaching every component from
 * the page's own stylesheet; a shadow root would wall that off and
 * need its own adopted stylesheet per instance instead of just working.
 *
 * Autonomous elements, not customized built-ins: Safari has never
 * implemented `<button is="...">`-style customized built-ins (a
 * long-standing WebKit position), so every Kernel element is its own
 * tag (`<kernel-button>`) that constructs and owns a real native
 * element as a managed light-DOM child, rather than trying to extend
 * the native tag directly. Works in every browser, and the real
 * element (a genuine `<button>`) still ends up in the DOM either way.
 */

import { trackInputModality } from "./utils/changeDetails";

// Change reasons need to know whether the last interaction was a pointer
// or a key; start listening as soon as any element module loads.
trackInputModality();

/** A built-in string override: plain text, a `{name}` template, or a
 * function given the same arguments as the React `labels` function. */
export type KernelLabelValue = string | ((...args: never[]) => string);
export type KernelLabels = Record<string, KernelLabelValue | readonly string[] | undefined>;

function kebab(key: string): string {
  return key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
}

/**
 * ARIA attributes an element hands from its host to the native control
 * it wraps (see `KernelElement.ariaTarget()`). `title` isn't one: it's
 * also a tooltip, and several elements read it as their heading text.
 */
export const FORWARDED_ARIA_ATTRIBUTES = ["aria-label", "aria-labelledby", "aria-describedby"] as const;
export type ForwardedAriaAttribute = (typeof FORWARDED_ARIA_ATTRIBUTES)[number];

function isForwardedAria(name: string): name is ForwardedAriaAttribute {
  return (FORWARDED_ARIA_ATTRIBUTES as readonly string[]).includes(name);
}

export class KernelElement extends HTMLElement {
  /** The real native element this custom element renders through.
   * Built once in connectedCallback and reused across reconnects. */
  protected native: HTMLElement | null = null;

  private kernelLabels: KernelLabels = {};

  constructor() {
    super();
    // `el.labels = {…}` assigned before the tag was defined lands as an
    // own property that would shadow the accessor below; re-route it.
    if (Object.prototype.hasOwnProperty.call(this, "labels")) {
      const early = (this as unknown as { labels: KernelLabels }).labels;
      delete (this as unknown as { labels?: KernelLabels }).labels;
      this.labels = early;
    }
  }

  /**
   * Overrides for the component's built-in strings (aria-labels, button
   * text, announcements) — the same keys as the React component's
   * `labels` prop. A value is plain text, a template with `{name}`
   * placeholders, or a function receiving the React function's
   * arguments. Each key is also readable from a `label-<kebab-key>`
   * attribute (`label-remove-tag="Supprimer {tag}"`); the property wins.
   */
  get labels(): KernelLabels {
    return this.kernelLabels;
  }

  set labels(value: KernelLabels) {
    this.kernelLabels = { ...(value ?? {}) };
    if (this.native) this.applyLabels();
  }

  /** Resolves one built-in string: `labels` property, then the
   * `label-<kebab-key>` attribute, then `fallback` (today's English).
   * `{name}` placeholders are filled from `params`. */
  protected builtInLabel(key: string, fallback: string, params?: Record<string, string | number>): string {
    const override = this.kernelLabels[key];
    if (typeof override === "function") {
      return (override as (...args: unknown[]) => string)(...Object.values(params ?? {}));
    }
    const template =
      typeof override === "string" ? override : (this.getAttribute(`label-${kebab(key)}`) ?? fallback);
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
  }

  /** A list-valued built-in string (e.g. weekday names): `labels`
   * property array, or a comma-separated `label-<kebab-key>` attribute. */
  protected builtInLabelList(key: string, fallback: readonly string[]): readonly string[] {
    const override = this.kernelLabels[key];
    if (Array.isArray(override)) return override;
    const attr = this.getAttribute(`label-${kebab(key)}`);
    return attr ? attr.split(",").map((s) => s.trim()) : fallback;
  }

  /** Re-applies built-in strings after a `labels` / `label-*` change.
   * Override in components that have any; the default does nothing. */
  protected applyLabels(): void {}

  static get observedAttributes(): string[] {
    return [];
  }

  /**
   * Dispatches a change event *before* the change is committed: bubbling,
   * cancelable, with `reason` (and the triggering `event`) added to
   * `detail`. Returns `false` when a listener called `preventDefault()` —
   * the caller then keeps its current state and skips side effects. Event
   * names stay whatever each element already used (`change`,
   * `valuechange`, `close`…); see `utils/changeDetails.ts`.
   */
  protected emitChange(type: string, detail: object, reason: string, event?: Event): boolean {
    return this.dispatchEvent(
      new CustomEvent(type, {
        bubbles: true,
        cancelable: true,
        detail: { ...detail, reason, event },
      }),
    );
  }

  connectedCallback() {
    if (this.native) return; // already built — e.g. re-inserted into the DOM
    const native = this.createNative();
    this.moveChildrenInto(native);
    this.native = native;
    this.append(native);
    this.syncAllAttrs();
  }

  /** Build the real element this component wraps. Override per
   * component; the default here covers the common "just needs a bare
   * element with the root class" case. */
  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = this.rootClass();
    return element;
  }

  /** The CSS class this element's native root should carry. Override
   * to return `kernelClass("ComponentName")`. */
  protected rootClass(): string {
    return "";
  }

  /** The id for the native control an element labels itself (the
   * `<input>` behind its own `<label for>`). An author's `id` stays on
   * the host, so `getElementById()` and `#id` selectors keep finding the
   * element and the events it dispatches; the control gets `<id>-control`.
   * Copying the host's id onto the control instead left two elements
   * sharing it, and `<label for>` resolved to the host, which isn't
   * labelable, so the control went unnamed. Without a host id, the
   * element's generated `fallback`. */
  protected controlId(fallback: string): string {
    const id = this.getAttribute("id");
    return id ? `${id}-control` : fallback;
  }

  /** Moves this custom element's own light-DOM children (whatever the
   * author wrote between its open/close tags) into `target`, once. */
  protected moveChildrenInto(target: Node) {
    while (this.firstChild) target.appendChild(this.firstChild);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (!this.native) return; // not connected yet — syncAllAttrs() will catch up
    if (name.startsWith("label-")) this.applyLabels();
    else if (isForwardedAria(name)) this.forwardAria(name, newValue);
    else this.syncAttr(name, newValue);
  }

  /** Re-applies every observed attribute to `native`. */
  protected syncAllAttrs() {
    const ctor = this.constructor as typeof KernelElement;
    for (const name of ctor.observedAttributes) {
      if (name.startsWith("label-")) continue;
      if (isForwardedAria(name)) this.forwardAria(name, this.getAttribute(name));
      else this.syncAttr(name, this.getAttribute(name));
    }
    this.applyLabels();
  }

  /**
   * The native element that should carry the host's `aria-label`,
   * `aria-labelledby` and `aria-describedby`: the real `<button>`,
   * `<input>`, `<select>` or `<progress>` that assistive tech lands on.
   * Left on the host, the attributes name nothing: the host is a generic
   * wrapper, not the control. Elements that wrap a control override this
   * and add `...FORWARDED_ARIA_ATTRIBUTES` to their `observedAttributes`;
   * the default `null` leaves the attributes where they are. The host
   * keeps its copy either way, so reading the attribute back still works.
   */
  protected ariaTarget(): Element | null {
    return null;
  }

  /** Copies one forwarded ARIA attribute onto `ariaTarget()`.
   * `aria-describedby` goes through `syncDescribedBy()` instead, since
   * many controls already point it at their own hint or error text. */
  protected forwardAria(name: ForwardedAriaAttribute, value: string | null) {
    if (name === "aria-describedby") {
      this.syncDescribedBy();
      return;
    }
    const target = this.ariaTarget();
    if (!target) return;
    if (value === null) target.removeAttribute(name);
    else target.setAttribute(name, value);
  }

  /** Re-applies the control's `aria-describedby`. Elements that describe
   * their control with their own hint or error text override this to
   * re-run that update, which goes through `setDescribedBy()`. */
  protected syncDescribedBy() {
    const target = this.ariaTarget();
    if (target) this.setDescribedBy(target, []);
  }

  /** Sets `target`'s `aria-describedby` to the element's own ids followed
   * by the ids the author put on the host, or removes it when there are
   * none. */
  protected setDescribedBy(target: Element, ownIds: readonly (string | null | undefined | false)[]) {
    const authored = this.getAttribute("aria-describedby")?.split(/\s+/) ?? [];
    const ids = [...new Set([...ownIds, ...authored].filter((id): id is string => Boolean(id)))];
    if (ids.length) target.setAttribute("aria-describedby", ids.join(" "));
    else target.removeAttribute("aria-describedby");
  }

  /** Default: mirror the attribute onto `native` as `data-{name}`,
   * Kernel's existing CSS convention (`[data-variant="primary"]`, and
   * so on — see any `*.module.css` in `packages/react`). Override for
   * attributes needing different handling (boolean DOM properties,
   * ARIA passthrough, structural changes). */
  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (value === null) this.native.removeAttribute(`data-${name}`);
    else this.native.setAttribute(`data-${name}`, value);
  }
}

/**
 * Kernel's stable CSS Modules naming convention
 * (`generateScopedName: "kernel-[folder]-[local]"` in
 * `packages/react/vite.config.ts`) reproduced here so every element in
 * this package reads the exact same class names the compiled React
 * styles already use — same tokens, same selectors, pixel-identical
 * output, with zero new CSS concepts to learn or maintain twice.
 */
export function kernelClass(component: string, part = "root"): string {
  return `kernel-${component}-${part}`;
}

/** True/false as a string, or omitted — the same shape React's own
 * `dataAttr()` helper (`packages/react/src/utils/polymorphic.ts`)
 * produces, reproduced here for parity. */
export function dataAttr(condition: boolean | undefined): "true" | undefined {
  return condition ? "true" : undefined;
}
