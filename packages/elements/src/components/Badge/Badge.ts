import { KernelElement, kernelClass } from "../../base";
import { observePillIcons } from "../../utils/pillIcons";
import "./Badge.css";

/**
 * `<kernel-badge>` — a small status chip. There's no HTML element for
 * "badge"; `<span>` is correct for an inline, semantically neutral run
 * of text that only needs presentational styling.
 *
 * Shaped as an optical pill, the same as React's `<Badge>`: the radius
 * stops at a true half-height pill, inline padding grows by the width the
 * end caps cut away, and an icon at either end (an `svg` or `img`, or any
 * `data-icon` element) becomes a `1lh` box concentric with the cap.
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

  connectedCallback() {
    const firstConnect = !this.native;
    super.connectedCallback();
    if (firstConnect && this.native) observePillIcons(this.native);
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "variant") this.native.dataset.variant = value ?? "neutral";
  }
}

customElements.define("kernel-badge", KernelBadge);
