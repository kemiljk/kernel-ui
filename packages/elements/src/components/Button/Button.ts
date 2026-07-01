import { KernelElement, kernelClass } from "../../base";
import "./Button.css";

/**
 * `<kernel-button>` — a real `<button>`. Renders as one by default
 * because that's the only element that gets click, keyboard
 * (Space/Enter), focus, and form association for free from the
 * browser. Mirrors `@kernelui/react`'s `<Button>`.
 *
 * Attributes: `variant` (primary/secondary/ghost/danger, default
 * secondary), `size` (sm/md/lg, default md), `disabled`, `loading`
 * (boolean attributes), `type` (button/submit/reset, default button).
 *
 * Icon slots aren't ported yet in this first pass — plain text/inline
 * content only. Fast-follow, not a structural limitation.
 */
export class KernelButton extends KernelElement {
  static get observedAttributes() {
    return ["variant", "size", "disabled", "loading", "type"];
  }

  connectedCallback() {
    if (this.native) return;
    const button = document.createElement("button");
    button.className = kernelClass("Button");

    const label = document.createElement("span");
    label.className = kernelClass("Button", "label");
    this.moveChildrenInto(label);
    button.append(label);

    this.native = button;
    this.append(button);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    switch (name) {
      case "variant":
        button.dataset.variant = value ?? "secondary";
        break;
      case "size":
        button.dataset.size = value ?? "md";
        break;
      case "type":
        button.type = (value as "button" | "submit" | "reset" | null) ?? "button";
        break;
      case "disabled":
      case "loading":
        this.syncDisabledAndLoading(button);
        break;
    }
  }

  private syncDisabledAndLoading(button: HTMLButtonElement) {
    const loading = this.hasAttribute("loading");
    const disabled = this.hasAttribute("disabled") || loading;
    button.disabled = disabled;
    button.dataset.loading = loading ? "true" : "false";
    if (loading) {
      button.setAttribute("aria-busy", "true");
      if (!button.querySelector(`.${kernelClass("Button", "spinner")}`)) {
        const spinner = document.createElement("span");
        spinner.className = kernelClass("Button", "spinner");
        spinner.setAttribute("aria-hidden", "true");
        button.append(spinner);
      }
    } else {
      button.removeAttribute("aria-busy");
      button.querySelector(`.${kernelClass("Button", "spinner")}`)?.remove();
    }
  }
}

customElements.define("kernel-button", KernelButton);
