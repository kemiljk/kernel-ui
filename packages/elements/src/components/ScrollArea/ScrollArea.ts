import { KernelElement, kernelClass } from "../../base";
import "./ScrollArea.css";

/**
 * `<kernel-scroll-area>` — a native overflow container. Attributes:
 * `max-block-size` (a CSS length string; omit it and control height via
 * the element's own `style`/class instead, same as `@kernelui/react`'s
 * `maxBlockSize` prop).
 */
export class KernelScrollArea extends KernelElement {
  static get observedAttributes() {
    return ["max-block-size"];
  }

  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = kernelClass("ScrollArea");
    return element;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "max-block-size") {
      if (value === null) this.native.style.removeProperty("max-block-size");
      else this.native.style.maxBlockSize = value;
    }
  }
}

customElements.define("kernel-scroll-area", KernelScrollArea);
