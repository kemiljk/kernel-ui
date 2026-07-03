import { KernelElement, kernelClass } from "../../base";
import "./ScrollArea.css";

const EDGE_FADE_DISTANCE = 24;

/**
 * `<kernel-scroll-area>` — a native overflow container. Attributes:
 * `max-block-size` (a CSS length string; omit it and control height via
 * the element's own `style`/class instead, same as `@kernelui-lib/react`'s
 * `maxBlockSize` prop), and `edge-shadow` (a boolean attribute — shows
 * an inset shadow at whichever edge still has content to scroll toward,
 * hidden again once that edge is actually scrolled into view).
 */
export class KernelScrollArea extends KernelElement {
  private resizeObserver: ResizeObserver | null = null;
  private frame: number | null = null;

  static get observedAttributes() {
    return ["max-block-size", "edge-shadow"];
  }

  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = kernelClass("ScrollArea");
    return element;
  }

  connectedCallback() {
    super.connectedCallback();
    this.syncEdgeShadowListener();
  }

  disconnectedCallback() {
    this.teardownEdgeShadow();
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "max-block-size") {
      if (value === null) this.native.style.removeProperty("max-block-size");
      else this.native.style.maxBlockSize = value;
      return;
    }
    if (name === "edge-shadow") {
      if (value === null) this.native.removeAttribute("data-edge-shadow");
      else this.native.setAttribute("data-edge-shadow", "");
      this.syncEdgeShadowListener();
    }
  }

  private syncEdgeShadowListener() {
    const el = this.native;
    if (!el) return;
    if (this.hasAttribute("edge-shadow")) {
      if (this.resizeObserver) return; // already wired
      el.addEventListener("scroll", this.scheduleMeasure, { passive: true });
      this.resizeObserver = new ResizeObserver(this.scheduleMeasure);
      this.resizeObserver.observe(el);
      this.measure();
    } else {
      this.teardownEdgeShadow();
    }
  }

  private teardownEdgeShadow() {
    this.native?.removeEventListener("scroll", this.scheduleMeasure);
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
    if (this.frame !== null) cancelAnimationFrame(this.frame);
  }

  private measure = () => {
    this.frame = null;
    const el = this.native;
    if (!el) return;
    const scrollable = el.scrollHeight - el.clientHeight;
    const top = scrollable > 0 ? Math.min(el.scrollTop / EDGE_FADE_DISTANCE, 1) : 0;
    const bottom =
      scrollable > 0
        ? Math.min((scrollable - el.scrollTop) / EDGE_FADE_DISTANCE, 1)
        : 0;
    el.style.setProperty("--kernel-scroll-shadow-top", String(top));
    el.style.setProperty("--kernel-scroll-shadow-bottom", String(bottom));
  };

  private scheduleMeasure = () => {
    if (this.frame === null) this.frame = requestAnimationFrame(this.measure);
  };
}

customElements.define("kernel-scroll-area", KernelScrollArea);
