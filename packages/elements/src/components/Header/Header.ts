import { KernelElement, dataAttr, kernelClass } from "../../base";
import "./Header.css";

/**
 * `<kernel-header>` — a real `<header>` landmark, not a `<div>`
 * pretending to be one.
 *
 * Attributes: `sticky` (boolean) — pins the header to the top of its
 * scroll container with a blurred backdrop.
 */
export class KernelHeader extends KernelElement {
  static get observedAttributes() {
    return ["sticky"];
  }

  protected createNative(): HTMLElement {
    const header = document.createElement("header");
    header.className = kernelClass("Header");
    return header;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native || name !== "sticky") return;
    const sticky = dataAttr(value !== null);
    if (sticky) this.native.setAttribute("data-sticky", sticky);
    else this.native.removeAttribute("data-sticky");
  }
}

customElements.define("kernel-header", KernelHeader);
