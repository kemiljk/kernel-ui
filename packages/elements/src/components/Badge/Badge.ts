import { KernelElement, kernelClass } from "../../base";
import "./Badge.css";

/**
 * `<kernel-badge>` — a small status chip. There's no HTML element for
 * "badge"; `<span>` is correct for an inline, semantically neutral run
 * of text that only needs presentational styling.
 *
 * Attributes: `variant` (neutral/accent/success/warning/danger,
 * default neutral).
 */
export class KernelBadge extends KernelElement {
  static get observedAttributes() {
    return ["variant"];
  }

  protected createNative(): HTMLElement {
    const span = document.createElement("span");
    span.className = kernelClass("Badge");
    return span;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "variant") this.native.dataset.variant = value ?? "neutral";
  }
}

customElements.define("kernel-badge", KernelBadge);
