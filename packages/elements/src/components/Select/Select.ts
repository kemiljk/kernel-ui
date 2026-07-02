import { KernelElement, kernelClass } from "../../base";
import "./Select.css";

let selectCounter = 0;

/**
 * `<kernel-select>` — a real `<select>`. Options, keyboard navigation,
 * typeahead, and the native picker UI (the platform's own, correct-for-
 * the-device picker on mobile) all come from the browser. Mirrors
 * `@kernelui/react`'s `<Select>`.
 *
 * Write real `<option>`/`<optgroup>` elements as children — not a
 * `kernel-select-option` wrapper: a native `<select>` only renders its
 * OWN native picker UI for direct `<option>`/`<optgroup>` children, not
 * for arbitrary custom elements, so wrapping them would silently break
 * the one thing this component exists to keep native.
 *
 * Attributes: `label` (required), `description`, `error-message`,
 * `invalid`, `required`, `disabled`, `value`, `name`.
 */
export class KernelSelect extends KernelElement {
  private readonly generatedId = `kernel-select-${++selectCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "description",
      "error-message",
      "invalid",
      "required",
      "disabled",
      "value",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("Select");

    const id = this.getAttribute("id") || this.generatedId;

    const label = document.createElement("label");
    label.className = kernelClass("Select", "label");
    label.htmlFor = id;

    const wrapper = document.createElement("div");
    wrapper.className = kernelClass("Select", "controlWrapper");

    const select = document.createElement("select");
    select.id = id;
    select.className = kernelClass("Select", "select");
    this.moveChildrenInto(select);

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("class", kernelClass("Select", "chevron"));
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML =
      '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />';

    wrapper.append(select, chevron);
    root.append(label, wrapper);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  private get select(): HTMLSelectElement | null {
    return this.native?.querySelector("select") ?? null;
  }

  private get label(): HTMLLabelElement | null {
    return this.native?.querySelector("label") ?? null;
  }

  private updateDescribedBy() {
    const select = this.select;
    if (!select) return;
    const id = select.id;
    const invalid = this.hasAttribute("invalid");
    const hasError = invalid && this.hasAttribute("error-message");
    const ids = [
      hasError ? `${id}-error` : null,
      this.hasAttribute("description") ? `${id}-description` : null,
    ].filter(Boolean);
    if (ids.length) select.setAttribute("aria-describedby", ids.join(" "));
    else select.removeAttribute("aria-describedby");
    this.renderHint();
  }

  private renderHint() {
    const root = this.native;
    const select = this.select;
    if (!root || !select) return;
    root.querySelector(`.${kernelClass("Select", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("Select", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("Select", "error");
      p.id = `${select.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("Select", "description");
      p.id = `${select.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  protected syncAttr(name: string, value: string | null) {
    const root = this.native;
    const select = this.select;
    const label = this.label;
    if (!root || !select || !label) return;

    switch (name) {
      case "label": {
        const required = this.hasAttribute("required");
        label.textContent = value ?? "";
        if (required) {
          const asterisk = document.createElement("span");
          asterisk.className = kernelClass("Select", "required");
          asterisk.setAttribute("aria-hidden", "true");
          asterisk.textContent = "*";
          label.append(asterisk);
        }
        break;
      }
      case "required":
        select.required = value !== null;
        this.syncAttr("label", this.getAttribute("label"));
        break;
      case "disabled":
        select.disabled = value !== null;
        break;
      case "value":
        if (value !== null) select.value = value;
        break;
      case "name":
        if (value === null) select.removeAttribute("name");
        else select.name = value;
        break;
      case "invalid":
        select.setAttribute("aria-invalid", value !== null ? "true" : "false");
        if (value !== null) root.setAttribute("data-invalid", "");
        else root.removeAttribute("data-invalid");
        this.updateDescribedBy();
        break;
      case "description":
      case "error-message":
        this.updateDescribedBy();
        break;
    }
  }
}

customElements.define("kernel-select", KernelSelect);
