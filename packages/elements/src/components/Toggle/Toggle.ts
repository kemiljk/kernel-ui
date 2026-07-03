import { KernelElement, kernelClass } from "../../base";
import "./Toggle.css";

/**
 * `<kernel-toggle>` — a real `<button aria-pressed>`, the WAI-ARIA
 * pattern for a two-state toggle that looks and behaves like a button (a
 * toolbar "bold" button, say), distinct from `<kernel-switch>`, which is
 * the pattern for an on/off setting. Mirrors `@kernelui-lib/react`'s
 * `<Toggle>`.
 *
 * Attributes: `pressed`, `disabled` (both boolean), `size`
 * (sm/md/lg, default md). Toggling dispatches a real, bubbling `change`
 * event.
 */
export class KernelToggle extends KernelElement {
  static get observedAttributes() {
    return ["pressed", "disabled", "size"];
  }

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Toggle");
    button.setAttribute("aria-pressed", "false");
    button.dataset.size = "md";
    button.dataset.state = "off";
    button.addEventListener("click", () => {
      if (this.hasAttribute("pressed")) this.removeAttribute("pressed");
      else this.setAttribute("pressed", "");
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });
    return button;
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    switch (name) {
      case "pressed": {
        const pressed = value !== null;
        button.setAttribute("aria-pressed", String(pressed));
        button.dataset.state = pressed ? "on" : "off";
        break;
      }
      case "disabled":
        button.disabled = value !== null;
        break;
      case "size":
        button.dataset.size = value ?? "md";
        break;
    }
  }
}

customElements.define("kernel-toggle", KernelToggle);
