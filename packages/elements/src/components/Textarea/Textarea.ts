import { KernelElement, kernelClass, dataAttr } from "../../base";
import "./Textarea.css";

let textareaCounter = 0;

/**
 * `<kernel-textarea>` — a real `<textarea>` that grows with its content
 * via `field-sizing: content` instead of a `scrollHeight`-measuring
 * resize listener (falls back to a manual resize handle where that
 * property isn't supported yet). Mirrors `@kernelui/react`'s
 * `<Textarea>`.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `description`,
 * `error-message`, `invalid`, `required`, `disabled`, `placeholder`,
 * `value`, `name`.
 */
export class KernelTextarea extends KernelElement {
  private readonly generatedId = `kernel-textarea-${++textareaCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "description",
      "error-message",
      "invalid",
      "required",
      "disabled",
      "placeholder",
      "value",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("Textarea");

    const id = this.getAttribute("id") || this.generatedId;

    const label = document.createElement("label");
    label.className = kernelClass("Textarea", "label");
    label.htmlFor = id;

    const textarea = document.createElement("textarea");
    textarea.id = id;
    textarea.className = kernelClass("Textarea", "input");

    root.append(label, textarea);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
  }

  private get textarea(): HTMLTextAreaElement | null {
    return this.native?.querySelector("textarea") ?? null;
  }

  private get label(): HTMLLabelElement | null {
    return this.native?.querySelector("label") ?? null;
  }

  private updateDescribedBy() {
    const textarea = this.textarea;
    const root = this.native;
    if (!textarea || !root) return;
    const id = textarea.id;
    const invalid = this.hasAttribute("invalid");
    const hasError = invalid && this.hasAttribute("error-message");
    const ids = [
      hasError ? `${id}-error` : null,
      this.hasAttribute("description") ? `${id}-description` : null,
    ].filter(Boolean);
    if (ids.length) textarea.setAttribute("aria-describedby", ids.join(" "));
    else textarea.removeAttribute("aria-describedby");
    this.renderHint();
  }

  private renderHint() {
    const root = this.native;
    const textarea = this.textarea;
    if (!root || !textarea) return;
    root.querySelector(`.${kernelClass("Textarea", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("Textarea", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("Textarea", "error");
      p.id = `${textarea.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("Textarea", "description");
      p.id = `${textarea.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  protected syncAttr(name: string, value: string | null) {
    const root = this.native;
    const textarea = this.textarea;
    const label = this.label;
    if (!root || !textarea || !label) return;

    switch (name) {
      case "label": {
        const required = this.hasAttribute("required");
        label.textContent = value ?? "";
        if (required) {
          const asterisk = document.createElement("span");
          asterisk.className = kernelClass("Textarea", "required");
          asterisk.setAttribute("aria-hidden", "true");
          asterisk.textContent = "*";
          label.append(asterisk);
        }
        break;
      }
      case "required":
        textarea.required = value !== null;
        this.syncAttr("label", this.getAttribute("label"));
        break;
      case "hide-label":
        label.classList.toggle("kernel-sr-only", value !== null);
        break;
      case "disabled":
        textarea.disabled = value !== null;
        break;
      case "placeholder":
        if (value === null) textarea.removeAttribute("placeholder");
        else textarea.placeholder = value;
        break;
      case "value":
        textarea.value = value ?? "";
        break;
      case "name":
        if (value === null) textarea.removeAttribute("name");
        else textarea.name = value;
        break;
      case "invalid":
        textarea.setAttribute("aria-invalid", value !== null ? "true" : "false");
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

customElements.define("kernel-textarea", KernelTextarea);
