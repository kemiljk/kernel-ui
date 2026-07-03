import { KernelElement, kernelClass } from "../../base";
import "./Switch.css";

/**
 * `<kernel-switch>` — there's no native "switch" element, so this follows
 * the WAI-ARIA switch pattern: a real `<button role="switch">` (click,
 * Space/Enter, and focus all free) with `aria-checked` telling assistive
 * tech it's a two-state toggle, not a regular button. Mirrors
 * `@kernelui-lib/react`'s `<Switch>`.
 *
 * Attributes: `checked`, `disabled` (both boolean). Text content, if
 * any, becomes a real `<label>` wrapping the button — omit it for a
 * bare switch. Toggling dispatches a real, bubbling `change` event,
 * same as any native form control.
 */
export class KernelSwitch extends KernelElement {
  static get observedAttributes() {
    return ["checked", "disabled"];
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

    button.addEventListener("click", () => {
      if (this.hasAttribute("checked")) this.removeAttribute("checked");
      else this.setAttribute("checked", "");
      this.dispatchEvent(new Event("change", { bubbles: true }));
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
        if (disabled) wrapper?.setAttribute("data-disabled", "");
        else wrapper?.removeAttribute("data-disabled");
        break;
      }
    }
  }
}

customElements.define("kernel-switch", KernelSwitch);
