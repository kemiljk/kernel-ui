import { FORWARDED_ARIA_ATTRIBUTES, KernelElement, kernelClass } from "../../base";
import "./Switch.css";
import { inputModality } from "../../utils/changeDetails";

/**
 * `<kernel-switch>` — there's no native "switch" element, so this follows
 * the WAI-ARIA switch pattern: a real `<button role="switch">` (click,
 * Space/Enter, and focus all free) with `aria-checked` telling assistive
 * tech it's a two-state toggle, not a regular button. Mirrors
 * `@kernelui-lib/react`'s `<Switch>`.
 *
 * Attributes: `checked`, `disabled` (both boolean). Text content, if
 * any, becomes a real `<label>` wrapping the button — omit it for a
 * bare switch. Toggling first dispatches a bubbling, cancelable
 * `beforevaluechange` with `detail: { checked, reason }` (`reason` is `"press"`
 * or `"keyboard"`); `preventDefault()` on it leaves the switch as it was.
 * Then the switch flips and a bubbling `valuechange` and `change` follow
 * with the same detail, after the commit as with any native control, so a `change`
 * handler reading `checked` sees the new state.
 *
 * `aria-label`, `aria-labelledby` and `aria-describedby` on the host are
 * forwarded to the inner `<button role="switch">`. With no text content,
 * give the switch a name this way (`aria-label="Bill yearly"`).
 */
export class KernelSwitch extends KernelElement {
  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES, "checked", "disabled"];
  }

  protected ariaTarget() {
    return this.native;
  }

  connectedCallback() {
    if (this.native) return;

    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Switch", "control");
    button.setAttribute("role", "switch");
    button.setAttribute("aria-checked", "false");

    const thumb = document.createElement("span");
    thumb.className = kernelClass("Switch", "thumb");
    button.append(thumb);

    button.addEventListener("click", (event) => {
      const checked = !this.hasAttribute("checked");
      const reason = inputModality(event) === "keyboard" ? "keyboard" : "press";
      if (!this.emitChange("beforevaluechange", { checked }, reason, event)) return;
      this.toggleAttribute("checked", checked);
      this.emitCommitted("valuechange", { checked }, reason, event);
      this.emitCommitted("change", { checked }, reason, event);
    });

    this.native = button;

    if (this.childNodes.length > 0) {
      const wrapper = document.createElement("label");
      wrapper.className = kernelClass("Switch");
      const labelText = document.createElement("span");
      labelText.className = kernelClass("Switch", "label");
      this.moveChildrenInto(labelText);
      wrapper.append(labelText, button);
      this.append(wrapper);
    } else {
      this.append(button);
    }

    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    const wrapper = this.querySelector(`.${kernelClass("Switch")}`);
    switch (name) {
      case "checked": {
        const checked = value !== null;
        button.setAttribute("aria-checked", String(checked));
        button.dataset.state = checked ? "checked" : "unchecked";
        break;
      }
      case "disabled": {
        const disabled = value !== null;
        button.disabled = disabled;
        if (disabled) button.dataset.disabled = "true";
        else delete button.dataset.disabled;
        if (disabled) wrapper?.setAttribute("data-disabled", "true");
        else wrapper?.removeAttribute("data-disabled");
        break;
      }
    }
  }
}

customElements.define("kernel-switch", KernelSwitch);
