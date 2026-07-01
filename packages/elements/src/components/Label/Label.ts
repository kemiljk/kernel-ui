import { KernelElement, kernelClass } from "../../base";
import "./Label.css";

/**
 * `<kernel-label>` — a standalone `<label>` for cases where a component
 * doesn't build its own. Set `for="<input id>"` the same way you would
 * on a plain `<label>`.
 *
 * Attributes: `for` (passed straight through to the native label),
 * `required` (boolean — shows a `*`).
 */
export class KernelLabel extends KernelElement {
  static get observedAttributes() {
    return ["for", "required"];
  }

  private requiredMark: HTMLSpanElement | null = null;

  connectedCallback() {
    if (this.native) return;
    const label = document.createElement("label");
    label.className = kernelClass("Label");
    this.moveChildrenInto(label);
    this.native = label;
    this.append(label);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const label = this.native as HTMLLabelElement | null;
    if (!label) return;
    if (name === "for") {
      if (value === null) label.removeAttribute("for");
      else label.htmlFor = value;
      return;
    }
    if (name === "required") {
      if (value === null) {
        this.requiredMark?.remove();
        this.requiredMark = null;
      } else if (!this.requiredMark) {
        this.requiredMark = document.createElement("span");
        this.requiredMark.className = kernelClass("Label", "required");
        this.requiredMark.setAttribute("aria-hidden", "true");
        this.requiredMark.textContent = "*";
        label.append(this.requiredMark);
      }
    }
  }
}

customElements.define("kernel-label", KernelLabel);
