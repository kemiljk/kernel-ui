import { FORWARDED_ARIA_ATTRIBUTES, KernelElement, kernelClass } from "../../base";
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
 * (sm/md/lg, default md). `aria-label` (for an icon-only toggle),
 * `aria-labelledby` and `aria-describedby` are forwarded to the inner
 * `<button>`; on the host they would name nothing.
 *
 * Events: a bubbling, cancelable `beforevaluechange` before the toggle flips,
 * `detail: { pressed, reason }` (`"press"` or `"keyboard"`);
 * `preventDefault()` leaves it as it was. Then a bubbling `valuechange`
 * and `change` with the same detail once the new state is committed.
 */
export class KernelToggle extends KernelElement {
  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES, "pressed", "disabled", "size"];
  }

  protected ariaTarget() {
    return this.native;
  }

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Toggle");
    button.setAttribute("aria-pressed", "false");
    button.dataset.size = "md";
    button.dataset.state = "off";
    // A cancelable `beforevaluechange` goes out before the flip,
    // `detail: { pressed, reason }` with `reason` `"press"` or `"keyboard"`;
    // `preventDefault()` vetoes it. `valuechange` and `change` follow once
    // committed.
    button.addEventListener("click", (event) => {
      const pressed = !this.hasAttribute("pressed");
      const reason = inputModality(event) === "keyboard" ? "keyboard" : "press";
      if (!this.emitChange("beforevaluechange", { pressed }, reason, event)) return;
      this.toggleAttribute("pressed", pressed);
      this.emitCommitted("valuechange", { pressed }, reason, event);
      this.emitCommitted("change", { pressed }, reason, event);
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
    }
  }
}

customElements.define("kernel-toggle", KernelToggle);
