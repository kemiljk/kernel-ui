import { KernelElement, kernelClass } from "../../base";
import "./Callout.css";

const ICONS: Record<string, string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

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
    content.className = kernelClass("Callout", "content");

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
    if (icon) icon.textContent = ICONS[variant] ?? "";
  }
}

customElements.define("kernel-callout", KernelCallout);
