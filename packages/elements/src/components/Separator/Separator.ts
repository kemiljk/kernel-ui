import { KernelElement, kernelClass } from "../../base";
import "./Separator.css";

/**
 * `<kernel-separator>` — a real `<hr>`. Browsers already expose it to
 * assistive tech as `role="separator"`; a horizontal rule is exactly
 * what a divider is. `orientation="vertical"` repaints it as a
 * vertical rule without changing what it means.
 *
 * Attributes: `orientation` (horizontal/vertical, default horizontal).
 */
export class KernelSeparator extends KernelElement {
  static get observedAttributes() {
    return ["orientation"];
  }

  protected createNative(): HTMLElement {
    const hr = document.createElement("hr");
    hr.className = kernelClass("Separator");
    return hr;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native || name !== "orientation") return;
    const orientation = value === "vertical" ? "vertical" : "horizontal";
    this.native.dataset.orientation = orientation;
    if (orientation === "vertical") this.native.setAttribute("aria-orientation", "vertical");
    else this.native.removeAttribute("aria-orientation");
  }
}

customElements.define("kernel-separator", KernelSeparator);
