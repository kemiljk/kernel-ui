import { KernelElement, kernelClass } from "../../base";
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
 */
export class KernelSidebar extends KernelElement {
  static get observedAttributes() {
    return ["aria-label"];
  }

  protected createNative(): HTMLElement {
    const aside = document.createElement("aside");
    aside.className = kernelClass("Sidebar");
    return aside;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native || name !== "aria-label") return;
    if (value === null) this.native.removeAttribute("aria-label");
    else this.native.setAttribute("aria-label", value);
  }
}

customElements.define("kernel-sidebar", KernelSidebar);
