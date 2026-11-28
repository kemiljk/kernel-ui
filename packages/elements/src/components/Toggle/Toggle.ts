import { KernelElement, kernelClass } from "../../base";
import { observePillIcons } from "../../utils/pillIcons";
import "./Toggle.css";
import { inputModality } from "../../utils/changeDetails";

/**
 * `<kernel-toggle>` — a real `<button aria-pressed>`, the WAI-ARIA
 * pattern for a two-state toggle that looks and behaves like a button (a
 * toolbar "bold" button, say), distinct from `<kernel-switch>`, which is
 * the pattern for an on/off setting. Mirrors `@kernelui-lib/react`'s
 * `<Toggle>`.
 *
 * Shaped like `<kernel-button>`: an optical pill at a round theme, with
 * an icon child at either end flagged by `observePillIcons()` so it sits
 * concentric with the corner (see `@kernelui-lib/react`'s `<Toggle>`).
 *
 * Attributes: `pressed`, `disabled` (both boolean), `size`
 * (sm/md/lg, default md), `aria-label` (forwarded to the inner
 * `<button>`, for an icon-only toggle — on the host it would name
 * nothing). Toggling dispatches a real, bubbling `change` event.
 */
export class KernelToggle extends KernelElement {
  static get observedAttributes() {
    return ["pressed", "disabled", "size", "aria-label"];
  }

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Toggle");
    button.setAttribute("aria-pressed", "false");
    button.dataset.size = "md";
    button.dataset.state = "off";
    // Dispatched before the flip, cancelable: `detail: { pressed, reason }`
    // with `reason` `"press"` or `"keyboard"`; `preventDefault()` vetoes it.
    button.addEventListener("click", (event) => {
      const pressed = !this.hasAttribute("pressed");
      const reason = inputModality(event) === "keyboard" ? "keyboard" : "press";
      if (!this.emitChange("change", { pressed }, reason, event)) return;
      this.toggleAttribute("pressed", pressed);
    });
    return button;
  }

  connectedCallback() {
    const firstConnect = !this.native;
    super.connectedCallback();
    if (firstConnect && this.native) observePillIcons(this.native);
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
        if (value !== null) button.dataset.disabled = "true";
        else delete button.dataset.disabled;
        break;
      case "size":
        button.dataset.size = value ?? "md";
        break;
      case "aria-label":
        if (value === null) button.removeAttribute("aria-label");
        else button.setAttribute("aria-label", value);
        break;
    }
  }
}

customElements.define("kernel-toggle", KernelToggle);
