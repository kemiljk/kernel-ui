import { FORWARDED_ARIA_ATTRIBUTES, KernelElement, kernelClass } from "../../base";
import "./Sidebar.css";

/**
 * `<kernel-sidebar>` — a real `<aside>` landmark for secondary or
 * complementary content, e.g. docs navigation, a table of contents, or
 * filters next to a list.
 *
 * Attributes: `aria-label` (required — an `<aside>` is a
 * "complementary" landmark, and a page can have several, so each needs
 * its own accessible name; forwarded onto the real `<aside>`, since the
 * outer custom element tag has no ARIA semantics of its own).
 * `aria-labelledby` and `aria-describedby` are forwarded the same way.
 */
export class KernelSidebar extends KernelElement {
  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES];
  }

  protected ariaTarget() {
    return this.native;
  }

  protected createNative(): HTMLElement {
    const aside = document.createElement("aside");
    aside.className = kernelClass("Sidebar");
    return aside;
  }
}

customElements.define("kernel-sidebar", KernelSidebar);
