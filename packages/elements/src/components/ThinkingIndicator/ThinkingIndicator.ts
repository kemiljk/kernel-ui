import { KernelElement, kernelClass } from "../../base";
import "./ThinkingIndicator.css";

/**
 * `<kernel-thinking-indicator>` — the universal "typing indicator"
 * (iMessage, Slack): three staggered dots next to a visible, shimmering
 * label. `role="status"`, same reasoning as Toast's `default`/`success`
 * case — a polite, non-interrupting live-region update.
 *
 * Attributes: `label` (default "Thinking").
 */
export class KernelThinkingIndicator extends KernelElement {
  static get observedAttributes() {
    return ["label"];
  }

  protected createNative(): HTMLElement {
    const root = document.createElement("span");
    root.setAttribute("role", "status");
    root.className = kernelClass("ThinkingIndicator");

    const dots = document.createElement("span");
    dots.className = kernelClass("ThinkingIndicator", "dots");
    dots.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) {
      const dot = document.createElement("span");
      dot.className = kernelClass("ThinkingIndicator", "dot");
      dots.append(dot);
    }

    const label = document.createElement("span");
    label.className = kernelClass("ThinkingIndicator", "label");
    label.textContent = "Thinking";

    root.append(dots, label);
    return root;
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "label" || !this.native) return;
    const label = this.native.querySelector(`.${kernelClass("ThinkingIndicator", "label")}`);
    if (label) label.textContent = value ?? "Thinking";
  }
}

customElements.define("kernel-thinking-indicator", KernelThinkingIndicator);
