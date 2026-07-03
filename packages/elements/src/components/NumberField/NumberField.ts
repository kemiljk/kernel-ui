import { KernelElement, kernelClass } from "../../base";
import "./NumberField.css";

let numberFieldCounter = 0;

const CHEVRON_UP = "M4 10L8 6L12 10";
const CHEVRON_DOWN = "M4 6L8 10L12 6";

function chevron(path: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

/**
 * `<kernel-number-field>` — `<kernel-text-field>`'s exact label/
 * description/error scaffold around a real `<input type="number">`.
 * The up/down buttons call the input's own native `stepUp()`/
 * `stepDown()` rather than reimplementing increment logic; since those
 * methods change `.value` without dispatching an event, this reads it
 * back and fires `change` by hand afterward. See
 * `@kernelui-lib/react`'s `NumberField.tsx` for the full rationale
 * (native spinner arrows hidden in CSS, buttons excluded from the tab
 * order since focused ArrowUp/ArrowDown already does the same thing
 * natively).
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value`, `min`, `max`,
 * `step` (default 1), `size` (sm/md/lg, default md), `description`,
 * `error-message`, `no-label-offset` (boolean — hard-aligns the label,
 * description, and error text flush left instead of the default inset
 * that lines them up with the input's own text padding), `invalid`,
 * `disabled`, `required`, `name`.
 */
export class KernelNumberField extends KernelElement {
  private readonly generatedId = `kernel-number-field-${++numberFieldCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "value",
      "min",
      "max",
      "step",
      "size",
      "description",
      "error-message",
      "no-label-offset",
      "invalid",
      "disabled",
      "required",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("NumberField");
    root.dataset.size = "md";

    const id = this.getAttribute("id") || this.generatedId;

    const label = document.createElement("label");
    label.className = kernelClass("NumberField", "label");
    label.htmlFor = id;

    const controlRow = document.createElement("div");
    controlRow.className = kernelClass("NumberField", "controlRow");

    const input = document.createElement("input");
    input.id = id;
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "1";
    input.className = kernelClass("NumberField", "input");
    input.addEventListener("change", () => {
      this.setAttribute("value", input.value);
    });

    const stepper = document.createElement("div");
    stepper.className = kernelClass("NumberField", "stepper");

    const up = document.createElement("button");
    up.type = "button";
    up.tabIndex = -1;
    up.setAttribute("aria-label", "Increment");
    up.className = kernelClass("NumberField", "stepperButton");
    up.append(chevron(CHEVRON_UP));
    up.addEventListener("click", () => this.stepBy(1));

    const down = document.createElement("button");
    down.type = "button";
    down.tabIndex = -1;
    down.setAttribute("aria-label", "Decrement");
    down.className = kernelClass("NumberField", "stepperButton");
    down.append(chevron(CHEVRON_DOWN));
    down.addEventListener("click", () => this.stepBy(-1));

    stepper.append(up, down);
    controlRow.append(input, stepper);
    root.append(label, controlRow);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
    this.updateStepperState();
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector(`.${kernelClass("NumberField", "input")}`) ?? null;
  }

  private stepBy(direction: 1 | -1) {
    const input = this.input;
    if (!input) return;
    if (direction === 1) input.stepUp();
    else input.stepDown();
    this.setAttribute("value", input.value);
    this.dispatchEvent(new Event("change", { bubbles: true }));
    input.focus();
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
    root.querySelector(`.${kernelClass("NumberField", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("NumberField", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("NumberField", "error");
      p.id = `${input.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("NumberField", "description");
      p.id = `${input.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  private updateStepperState() {
    const input = this.input;
    const stepper = this.native?.querySelector(`.${kernelClass("NumberField", "stepper")}`);
    if (!input || !stepper) return;
    const [up, down] = stepper.querySelectorAll("button");
    const disabled = this.hasAttribute("disabled");
    const value = input.value === "" ? null : Number(input.value);
    const max = this.getAttribute("max");
    const min = this.getAttribute("min");
    if (up) up.disabled = disabled || (max != null && value != null && value >= Number(max));
    if (down) down.disabled = disabled || (min != null && value != null && value <= Number(min));
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    const input = this.input;

    switch (name) {
      case "label": {
        const labelEl = this.native.querySelector(`.${kernelClass("NumberField", "label")}`);
        if (labelEl) labelEl.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const labelEl = this.native.querySelector(`.${kernelClass("NumberField", "label")}`);
        labelEl?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "value":
        if (input) input.value = value ?? "";
        this.updateStepperState();
        break;
      case "min":
        if (input) {
          if (value === null) input.removeAttribute("min");
          else input.min = value;
        }
        this.updateStepperState();
        break;
      case "max":
        if (input) {
          if (value === null) input.removeAttribute("max");
          else input.max = value;
        }
        this.updateStepperState();
        break;
      case "step":
        if (input) input.step = value ?? "1";
        break;
      case "size":
        this.native.dataset.size = value ?? "md";
        break;
      case "invalid":
        if (value !== null) this.native.setAttribute("data-invalid", "");
        else this.native.removeAttribute("data-invalid");
        this.updateDescribedBy();
        break;
      case "description":
      case "error-message":
        this.updateDescribedBy();
        break;
      case "no-label-offset":
        if (value !== null) this.native.setAttribute("data-label-offset", "false");
        else this.native.removeAttribute("data-label-offset");
        break;
      case "disabled":
        if (input) input.disabled = value !== null;
        this.updateStepperState();
        break;
      case "required":
        if (input) input.required = value !== null;
        break;
      case "name":
        if (input) {
          if (value === null) input.removeAttribute("name");
          else input.name = value;
        }
        break;
    }
  }
}

customElements.define("kernel-number-field", KernelNumberField);
