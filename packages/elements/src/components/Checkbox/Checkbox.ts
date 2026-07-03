import { KernelElement, kernelClass } from "../../base";
import "./Checkbox.css";

/**
 * `<kernel-checkbox>` — a real `<input type="checkbox">` inside a real
 * `<label>`, so clicking the text toggles the box for free. Mirrors
 * `@kernelui/react`'s `<Checkbox>`.
 *
 * Attributes: `checked`, `disabled`, `required` (all boolean), `name`,
 * `value`. `indeterminate` has no HTML attribute on the platform's own
 * checkbox either — set it as a live property (`el.indeterminate =
 * true`) same as any native one. The real inner `<input>` fires real,
 * bubbling `change` events; listen on it directly or on this element,
 * no synthetic event needed.
 */
export class KernelCheckbox extends KernelElement {
  static get observedAttributes() {
    return ["checked", "disabled", "required", "name", "value"];
  }

  protected createNative(): HTMLElement {
    const label = document.createElement("label");
    label.className = kernelClass("Checkbox");

    const input = document.createElement("input");
    input.type = "checkbox";
    input.className = kernelClass("Checkbox", "input");

    const control = document.createElement("span");
    control.className = kernelClass("Checkbox", "control");
    control.setAttribute("aria-hidden", "true");
    control.innerHTML = `
      <svg class="${kernelClass("Checkbox", "icon")}" viewBox="0 0 16 16" fill="none">
        <path class="${kernelClass("Checkbox", "checkmark")}" d="M3.5 8.5L6.5 11.5L12.5 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" pathLength="1" />
        <rect class="${kernelClass("Checkbox", "dash")}" x="3.5" y="7.25" width="9" height="1.5" rx="0.75" fill="currentColor" />
      </svg>
    `.trim();

    const labelText = document.createElement("span");
    labelText.className = kernelClass("Checkbox", "label");
    this.moveChildrenInto(labelText);

    label.append(input, control);
    if (labelText.childNodes.length) label.append(labelText);
    return label;
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector("input") ?? null;
  }

  protected syncAttr(name: string, value: string | null) {
    const label = this.native;
    const input = this.input;
    if (!label || !input) return;
    switch (name) {
      case "checked":
        input.checked = value !== null;
        break;
      case "disabled":
        input.disabled = value !== null;
        if (value !== null) label.setAttribute("data-disabled", "");
        else label.removeAttribute("data-disabled");
        break;
      case "required":
        input.required = value !== null;
        break;
      case "name":
        if (value === null) input.removeAttribute("name");
        else input.name = value;
        break;
      case "value":
        if (value === null) input.removeAttribute("value");
        else input.value = value;
        break;
    }
  }
}

customElements.define("kernel-checkbox", KernelCheckbox);
