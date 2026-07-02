import { KernelElement, kernelClass } from "../../base";
import "./RadioGroup.css";

let radioGroupCounter = 0;

/**
 * `<kernel-radio-group>` — a real `<fieldset>` + `<legend>` grouping
 * real `<input type="radio">` elements (via `<kernel-radio-group-item>`)
 * that share one `name`. Arrow-key roving between options, "exactly one
 * selected", and disabling every option at once (a real `<fieldset
 * disabled>` cascades to every form control inside it, no JS needed)
 * are all native radio/fieldset behaviour. Mirrors `@kernelui/react`'s
 * `<RadioGroup>` + `<RadioGroupItem>`.
 *
 * Attributes: `label` (required — a `<fieldset>` needs a `<legend>` the
 * same way a form field needs a label), `name` (generated if omitted,
 * so items still share a real name without the author inventing one),
 * `disabled`.
 */
export class KernelRadioGroup extends KernelElement {
  private readonly generatedName = `kernel-radio-group-${++radioGroupCounter}`;

  static get observedAttributes() {
    return ["label", "disabled"];
  }

  get resolvedName(): string {
    return this.getAttribute("name") || this.generatedName;
  }

  connectedCallback() {
    if (this.native) return;
    const fieldset = document.createElement("fieldset");
    fieldset.className = kernelClass("RadioGroup");

    const legend = document.createElement("legend");
    legend.className = kernelClass("RadioGroup", "legend");

    const options = document.createElement("div");
    options.className = kernelClass("RadioGroup", "options");
    this.moveChildrenInto(options);

    fieldset.append(legend, options);
    this.native = fieldset;
    this.append(fieldset);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const fieldset = this.native as HTMLFieldSetElement | null;
    if (!fieldset) return;
    switch (name) {
      case "label": {
        const legend = fieldset.querySelector(`.${kernelClass("RadioGroup", "legend")}`);
        if (legend) legend.textContent = value ?? "";
        break;
      }
      case "disabled":
        fieldset.disabled = value !== null;
        break;
    }
  }
}

/**
 * `<kernel-radio-group-item>` — one option inside a `<kernel-radio-group>`.
 * Attributes: `value` (required), `disabled`.
 */
export class KernelRadioGroupItem extends KernelElement {
  static get observedAttributes() {
    return ["value", "disabled"];
  }

  connectedCallback() {
    if (this.native) return;

    const label = document.createElement("label");
    label.className = kernelClass("RadioGroup", "item");

    const input = document.createElement("input");
    input.type = "radio";
    input.className = kernelClass("RadioGroup", "input");
    const group = this.closest("kernel-radio-group") as KernelRadioGroup | null;
    input.name = group?.resolvedName ?? "kernel-radio-group";

    const control = document.createElement("span");
    control.className = kernelClass("RadioGroup", "control");
    control.setAttribute("aria-hidden", "true");

    const labelText = document.createElement("span");
    labelText.className = kernelClass("RadioGroup", "label");
    this.moveChildrenInto(labelText);

    label.append(input, control);
    if (labelText.childNodes.length) label.append(labelText);

    this.native = label;
    this.append(label);
    this.syncAllAttrs();
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector("input") ?? null;
  }

  protected syncAttr(name: string, value: string | null) {
    const input = this.input;
    if (!input) return;
    switch (name) {
      case "value":
        input.value = value ?? "";
        break;
      case "disabled":
        input.disabled = value !== null;
        break;
    }
  }
}

customElements.define("kernel-radio-group", KernelRadioGroup);
customElements.define("kernel-radio-group-item", KernelRadioGroupItem);
