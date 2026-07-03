import { KernelElement, kernelClass } from "../../base";
import "./Avatar.css";

/**
 * `<kernel-avatar>` — a real `<img>` when there's a picture to show.
 * Broken and missing images can't be detected in CSS alone, so the
 * fallback swap is the one piece of unavoidable JavaScript here (an
 * `error` listener), everything else, alt text included, is the
 * browser's native image handling. Mirrors `@kernelui-lib/react`'s
 * `<Avatar>`.
 *
 * Attributes: `src`, `alt`, `fallback` (shown while there's no `src`, or
 * if the image fails to load — usually initials).
 */
export class KernelAvatar extends KernelElement {
  private errored = false;

  static get observedAttributes() {
    return ["src", "alt", "fallback"];
  }

  protected createNative(): HTMLElement {
    const root = document.createElement("span");
    root.className = kernelClass("Avatar");
    return root;
  }

  connectedCallback() {
    super.connectedCallback();
    this.render();
  }

  protected syncAttr() {
    this.render();
  }

  private render() {
    const root = this.native;
    if (!root) return;

    const src = this.getAttribute("src");
    const alt = this.getAttribute("alt");
    const fallback = this.getAttribute("fallback") ?? "";
    const showFallback = !src || this.errored;

    root.replaceChildren();

    if (showFallback) {
      const span = document.createElement("span");
      span.className = kernelClass("Avatar", "fallback");
      if (!alt) span.setAttribute("aria-hidden", "true");
      span.textContent = fallback;
      root.append(span);
      return;
    }

    const img = document.createElement("img");
    img.className = kernelClass("Avatar", "image");
    img.src = src;
    if (alt) img.alt = alt;
    img.addEventListener("error", () => {
      this.errored = true;
      this.render();
    });
    root.append(img);
  }
}

customElements.define("kernel-avatar", KernelAvatar);
