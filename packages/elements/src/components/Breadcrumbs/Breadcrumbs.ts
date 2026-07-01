import { KernelElement, kernelClass } from "../../base";
import "./Breadcrumbs.css";

/**
 * `<kernel-breadcrumbs>` — a real `<nav aria-label="Breadcrumb">`
 * wrapping a real `<ol>`; it's an ordered trail, so list semantics are
 * correct. Compose with `<kernel-breadcrumb-item>`.
 */
export class KernelBreadcrumbs extends KernelElement {
  connectedCallback() {
    if (this.native) return;
    const nav = document.createElement("nav");
    nav.className = kernelClass("Breadcrumbs");
    nav.setAttribute("aria-label", "Breadcrumb");
    const list = document.createElement("ol");
    list.className = kernelClass("Breadcrumbs", "list");
    this.moveChildrenInto(list);
    nav.append(list);
    this.native = nav;
    this.append(nav);
  }
}

/**
 * `<kernel-breadcrumb-item>` — the current page isn't a link; it's
 * marked `aria-current="page"` on plain text instead (you don't link
 * to where you already are), and doesn't get a trailing separator.
 *
 * Attributes: `href`, `current` (boolean).
 */
export class KernelBreadcrumbItem extends KernelElement {
  static get observedAttributes() {
    return ["href", "current"];
  }

  /** The item's own label content, captured once on connect. Re-render
   * (e.g. toggling `current` later) moves these same nodes into a new
   * wrapper each time rather than re-reading `this`'s children, which
   * would already be empty after the first render moved them out. */
  private labelNodes: ChildNode[] = [];

  connectedCallback() {
    if (this.native) return;
    const fragment = document.createDocumentFragment();
    this.moveChildrenInto(fragment);
    this.labelNodes = Array.from(fragment.childNodes);

    const li = document.createElement("li");
    li.className = kernelClass("Breadcrumbs", "item");
    this.native = li;
    this.append(li);
    this.render();
  }

  attributeChangedCallback() {
    if (this.native) this.render();
  }

  private render() {
    const li = this.native;
    if (!li) return;
    const current = this.hasAttribute("current");
    li.replaceChildren();

    if (current) {
      const span = document.createElement("span");
      span.setAttribute("aria-current", "page");
      span.className = kernelClass("Breadcrumbs", "current");
      span.append(...this.labelNodes);
      li.append(span);
    } else {
      const link = document.createElement("a");
      link.className = kernelClass("Breadcrumbs", "link");
      const href = this.getAttribute("href");
      if (href !== null) link.href = href;
      link.append(...this.labelNodes);
      li.append(link);

      const separator = document.createElement("span");
      separator.className = kernelClass("Breadcrumbs", "separator");
      separator.setAttribute("aria-hidden", "true");
      separator.textContent = "/";
      li.append(separator);
    }
  }
}

customElements.define("kernel-breadcrumbs", KernelBreadcrumbs);
customElements.define("kernel-breadcrumb-item", KernelBreadcrumbItem);
