import { KernelElement, kernelClass } from "../../base";
import "./Slider.css";

let sliderCounter = 0;

/**
 * `<kernel-slider>` — a real `<input type="range">`. Dragging, arrow-key
 * stepping, Page Up/Down, Home/End, and touch support are all native.
 * The filled portion of the track has no standardised styling API yet,
 * so this computes the percentage on every `input` event and feeds it
 * back in as a CSS custom property (`--percent`), the same hand-off
 * `@kernelui-lib/react`'s `<Slider>` does.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value` (default 0),
 * `min` (default 0), `max` (default 100), `step` (default 1),
 * `show-value` (boolean — shows the current number next to the label),
 * `disabled`, `name`.
 */
export class KernelSlider extends KernelElement {
  private readonly generatedId = `kernel-slider-${++sliderCounter}`;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "value",
      "min",
      "max",
      "step",
      "show-value",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("Slider");

    const id = this.getAttribute("id") || this.generatedId;

    const labelRow = document.createElement("div");
    labelRow.className = kernelClass("Slider", "labelRow");

    const label = document.createElement("label");
    label.className = kernelClass("Slider", "label");
    label.htmlFor = id;

    labelRow.append(label);

    const input = document.createElement("input");
    input.id = id;
    input.type = "range";
    input.min = "0";
    input.max = "100";
    input.step = "1";
    input.value = "0";
    input.className = kernelClass("Slider", "input");
    input.addEventListener("input", () => {
      this.updatePercent();
      this.setAttribute("value", input.value);
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    root.append(labelRow, input);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
    this.updatePercent();
  }

  private get input(): HTMLInputElement | null {
    return this.native?.querySelector("input") ?? null;
  }

  private updatePercent() {
    const input = this.input;
    if (!input) return;
    const min = Number(input.min);
    const max = Number(input.max);
    const percent = ((Number(input.value) - min) / (max - min)) * 100;
    input.style.setProperty("--percent", `${percent}%`);
  }

  private renderValue() {
    const root = this.native;
    const input = this.input;
    if (!root || !input) return;
    root.querySelector(`.${kernelClass("Slider", "value")}`)?.remove();
    if (!this.hasAttribute("show-value")) return;
    const span = document.createElement("span");
    span.className = kernelClass("Slider", "value");
    span.textContent = input.value;
    root.querySelector(`.${kernelClass("Slider", "labelRow")}`)?.append(span);
  }

  protected syncAttr(name: string, value: string | null) {
    const input = this.input;
    if (!input) return;

    switch (name) {
      case "label": {
        const label = this.native?.querySelector("label");
        if (label) label.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const label = this.native?.querySelector("label");
        label?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "value":
        input.value = value ?? "0";
        this.updatePercent();
        this.renderValue();
        break;
      case "min":
        input.min = value ?? "0";
        this.updatePercent();
        break;
      case "max":
        input.max = value ?? "100";
        this.updatePercent();
        break;
      case "step":
        input.step = value ?? "1";
        break;
      case "show-value":
        this.renderValue();
        break;
      case "disabled":
        input.disabled = value !== null;
        break;
      case "name":
        if (value === null) input.removeAttribute("name");
        else input.name = value;
        break;
    }
  }
}

customElements.define("kernel-slider", KernelSlider);
