import { KernelElement, kernelClass } from "../../base";
import "./Select.css";
import { inputModality } from "../../utils/changeDetails";

let selectCounter = 0;

/**
 * `<kernel-select>` — a real `<select>`. Options, keyboard navigation,
 * typeahead, and form behaviour come from the browser. Supporting browsers
 * get a token-styled native picker; others keep the platform picker. Mirrors
 * `@kernelui-lib/react`'s `<Select>`.
 *
 * Write real `<option>`/`<optgroup>` elements as children — not a
 * `kernel-select-option` wrapper: a native `<select>` only renders its
 * OWN native picker UI for direct `<option>`/`<optgroup>` children, not
 * for arbitrary custom elements, so wrapping them would silently break
 * the one thing this component exists to keep native.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `description`,
 * `error-message`, `no-label-offset` (boolean — hard-aligns the label,
 * description, and error text flush left instead of the default inset
 * that lines them up with the select's own text padding), `invalid`,
 * `required`, `disabled`, `value`, `name`.
 *
 * Change reasons: a native `change` can't be cancelled, so a bubbling,
 * cancelable `valuechange` is dispatched from this element first, with
 * `detail: { value, reason }` — `"item-press"`, `"keyboard"` or
 * `"typeahead"`, worked out from the last pointer/key on the control (a
 * platform picker that's a separate OS menu may swallow those keys, so
 * it's best-effort there). `preventDefault()` restores the previous option
 * and stops the native `change` at this element.
 */
export class KernelSelect extends KernelElement {
  private readonly generatedId = `kernel-select-${++selectCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "description",
      "error-message",
      "no-label-offset",
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
    chevron.setAttribute("width", "16");
    chevron.setAttribute("height", "16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.innerHTML =
      '<path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />';

    let lastKey: string | null = null;
    let previousValue = select.value;
    select.addEventListener("keydown", (event) => (lastKey = event.key));
    select.addEventListener("pointerdown", () => (lastKey = null));
    select.addEventListener("focus", () => (previousValue = select.value));
    wrapper.addEventListener("change", (event) => {
      if (event.target !== select) return;
      const reason =
        inputModality(event) !== "keyboard"
          ? "item-press"
          : lastKey && lastKey.length === 1 && lastKey !== " "
            ? "typeahead"
            : "keyboard";
      if (!this.emitChange("valuechange", { value: select.value }, reason, event)) {
        select.value = previousValue;
        event.stopPropagation();
        return;
      }
      previousValue = select.value;
    });

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
      case "hide-label":
        label.classList.toggle("kernel-sr-only", value !== null);
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
        // Omitted when valid, like React's `aria-invalid={invalid || undefined}`.
        if (value !== null) select.setAttribute("aria-invalid", "true");
        else select.removeAttribute("aria-invalid");
        if (value !== null) root.setAttribute("data-invalid", "true");
        else root.removeAttribute("data-invalid");
        this.updateDescribedBy();
        break;
      case "description":
      case "error-message":
        this.updateDescribedBy();
        break;
      case "no-label-offset":
        if (value !== null) root.setAttribute("data-label-offset", "false");
        else root.removeAttribute("data-label-offset");
        break;
    }
  }
}

customElements.define("kernel-select", KernelSelect);
