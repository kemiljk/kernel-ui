import { KernelElement, kernelClass } from "../../base";
import "./Callout.css";

/** Same hand-authored 16px stroke icons as @kernelui-lib/react's Callout. */
const ICONS: Record<string, string[]> = {
  info: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M8 7.25V11", "M8 5H8.01"],
  success: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M5.5 8.25L7.25 10L10.5 6.25"],
  warning: ["M8 2.25L14.25 13.25H1.75L8 2.25Z", "M8 6.5V9", "M8 11.25H8.01"],
  danger: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M6 6L10 10M10 6L6 10"],
};

const SVG_NS = "http://www.w3.org/2000/svg";

function calloutIcon(variant: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  for (const d of ICONS[variant] ?? []) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.5");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    svg.append(path);
  }
  return svg;
}

/**
 * `<kernel-callout>` — there's no `<callout>` element; ARIA live-region
 * roles are the correct tool for exactly this gap: content that should
 * be announced to assistive tech as soon as it appears. `danger`/
 * `warning` interrupt (`role="alert"`, assertive); `info`/`success`
 * wait their turn (`role="status"`, polite).
 *
 * Attributes: `variant` (info/success/warning/danger, default info).
 * A child marked `slot="title"` becomes the bold title line; everything
 * else becomes the body.
 */
export class KernelCallout extends KernelElement {
  static get observedAttributes() {
    return ["variant"];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("Callout");

    const icon = document.createElement("span");
    icon.className = kernelClass("Callout", "icon");
    icon.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");

    const titleSlot = this.querySelector('[slot="title"]');
    if (titleSlot) {
      const title = document.createElement("p");
      title.className = kernelClass("Callout", "title");
      title.append(titleSlot);
      content.append(title);
    }

    const body = document.createElement("div");
    body.className = kernelClass("Callout", "body");
    this.moveChildrenInto(body);
    content.append(body);

    root.append(icon, content);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native || name !== "variant") return;
    const variant = value && value in ICONS ? value : "info";
    this.native.dataset.variant = variant;
    this.native.setAttribute(
      "role",
      variant === "danger" || variant === "warning" ? "alert" : "status",
    );
    const icon = this.native.querySelector(`.${kernelClass("Callout", "icon")}`);
    if (icon) icon.replaceChildren(calloutIcon(variant));
  }
}

customElements.define("kernel-callout", KernelCallout);
