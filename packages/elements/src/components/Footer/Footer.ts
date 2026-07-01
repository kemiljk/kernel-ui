import { KernelElement, kernelClass } from "../../base";
import "./Footer.css";

/** `<kernel-footer>` — a real `<footer>` landmark. */
export class KernelFooter extends KernelElement {
  protected createNative(): HTMLElement {
    const footer = document.createElement("footer");
    footer.className = kernelClass("Footer");
    return footer;
  }
}

customElements.define("kernel-footer", KernelFooter);
