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

export class KernelElement extends HTMLElement {
  /** The real native element this custom element renders through.
   * Built once in connectedCallback and reused across reconnects. */
  protected native: HTMLElement | null = null;

  static get observedAttributes(): string[] {
    return [];
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

  /** Moves this custom element's own light-DOM children (whatever the
   * author wrote between its open/close tags) into `target`, once. */
  protected moveChildrenInto(target: Node) {
    while (this.firstChild) target.appendChild(this.firstChild);
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null) {
    if (!this.native) return; // not connected yet — syncAllAttrs() will catch up
    this.syncAttr(name, newValue);
  }

  /** Re-applies every observed attribute to `native`. */
  protected syncAllAttrs() {
    const ctor = this.constructor as typeof KernelElement;
    for (const name of ctor.observedAttributes) {
      this.syncAttr(name, this.getAttribute(name));
    }
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
