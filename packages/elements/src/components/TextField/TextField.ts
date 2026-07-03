import { KernelElement, kernelClass } from "../../base";
import "./TextField.css";

let textFieldCounter = 0;

/**
 * `<kernel-text-field>` — a real `<label>` + `<input>` pair with correct
 * `aria-describedby` wiring for hint and error text. `:user-invalid`
 * handles live, post-interaction validation styling natively; the
 * `invalid` attribute is for validation you already know about before
 * the user has touched the field. Mirrors `@kernelui/react`'s
 * `<TextField>`.
 *
 * Attributes: `label` (required, still the input's accessible name even
 * when `hide-label` is set), `hide-label` (boolean — visually hides the
 * label without removing it from the accessibility tree), `description`,
 * `error-message`, `invalid`, `required`, `disabled`, `size` (sm/md/lg,
 * default md), `type` (default text), `placeholder`, `value`, `name`.
 */
export class KernelTextField extends KernelElement {
  private readonly generatedId = `kernel-text-field-${++textFieldCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "description",
      "error-message",
      "invalid",
      "required",
      "disabled",
      "size",
      "type",
      "placeholder",
      "value",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("TextField");
    root.dataset.size = "md";

    const id = this.getAttribute("id") || this.generatedId;

    const label = document.createElement("label");
    label.className = kernelClass("TextField", "label");
    label.htmlFor = id;

    const input = document.createElement("input");
    input.id = id;
    input.type = "text";
    input.className = kernelClass("TextField", "input");

    root.append(label, input);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector("input") ?? null;
  }

  private get label(): HTMLLabelElement | null {
    return this.native?.querySelector("label") ?? null;
  }

  private updateDescribedBy() {
    const input = this.input;
    if (!input) return;
    const id = input.id;
    const invalid = this.hasAttribute("invalid");
    const hasError = invalid && this.hasAttribute("error-message");
    const ids = [
      hasError ? `${id}-error` : null,
      this.hasAttribute("description") ? `${id}-description` : null,
    ].filter(Boolean);
    if (ids.length) input.setAttribute("aria-describedby", ids.join(" "));
    else input.removeAttribute("aria-describedby");
    this.renderHint();
  }

  private renderHint() {
    const root = this.native;
    const input = this.input;
    if (!root || !input) return;
    root.querySelector(`.${kernelClass("TextField", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("TextField", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("TextField", "error");
      p.id = `${input.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("TextField", "description");
      p.id = `${input.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  protected syncAttr(name: string, value: string | null) {
    const root = this.native;
    const input = this.input;
    const label = this.label;
    if (!root || !input || !label) return;

    switch (name) {
      case "label": {
        const required = this.hasAttribute("required");
        label.textContent = value ?? "";
        if (required) {
          const asterisk = document.createElement("span");
          asterisk.className = kernelClass("TextField", "required");
          asterisk.setAttribute("aria-hidden", "true");
          asterisk.textContent = "*";
          label.append(asterisk);
        }
        break;
      }
      case "required":
        input.required = value !== null;
        this.syncAttr("label", this.getAttribute("label"));
        break;
      case "hide-label":
        label.classList.toggle("kernel-sr-only", value !== null);
        break;
      case "disabled":
        input.disabled = value !== null;
        break;
      case "size":
        root.dataset.size = value ?? "md";
        break;
      case "type":
        input.type = value ?? "text";
        break;
      case "placeholder":
        if (value === null) input.removeAttribute("placeholder");
        else input.placeholder = value;
        break;
      case "value":
        input.value = value ?? "";
        break;
      case "name":
        if (value === null) input.removeAttribute("name");
        else input.name = value;
        break;
      case "invalid":
        input.setAttribute("aria-invalid", value !== null ? "true" : "false");
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

customElements.define("kernel-text-field", KernelTextField);
