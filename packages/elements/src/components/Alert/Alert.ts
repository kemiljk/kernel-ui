import { KernelElement, kernelClass } from "../../base";
import "./Alert.css";

const ICONS: Record<string, string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

/**
 * `<kernel-alert>` — there's no `<alert>` element; ARIA live-region
 * roles are the correct tool for exactly this gap: content that should
 * be announced to assistive tech as soon as it appears. `danger`/
 * `warning` interrupt (`role="alert"`, assertive); `info`/`success`
 * wait their turn (`role="status"`, polite).
 *
 * Attributes: `variant` (info/success/warning/danger, default info).
 * A child marked `slot="title"` becomes the bold title line; everything
 * else becomes the body.
 */
export class KernelAlert extends KernelElement {
  static get observedAttributes() {
    return ["variant"];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("Alert");

    const icon = document.createElement("span");
    icon.className = kernelClass("Alert", "icon");
    icon.setAttribute("aria-hidden", "true");

    const content = document.createElement("div");
    content.className = kernelClass("Alert", "content");

    const titleSlot = this.querySelector('[slot="title"]');
    if (titleSlot) {
      const title = document.createElement("p");
      title.className = kernelClass("Alert", "title");
      title.append(titleSlot);
      content.append(title);
    }

    const body = document.createElement("div");
    body.className = kernelClass("Alert", "body");
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
    const icon = this.native.querySelector(`.${kernelClass("Alert", "icon")}`);
    if (icon) icon.textContent = ICONS[variant] ?? "";
  }
}

customElements.define("kernel-alert", KernelAlert);
