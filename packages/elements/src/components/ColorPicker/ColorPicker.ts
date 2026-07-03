import { KernelElement, kernelClass } from "../../base";
import "./ColorPicker.css";

let colorPickerCounter = 0;

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

function normalizeHex(raw: string): string | null {
  const match = HEX_PATTERN.exec(raw.trim());
  if (!match?.[1]) return null;
  const digits = match[1];
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;
  return `#${expanded.toLowerCase()}`;
}

/**
 * `<kernel-color-picker>` — a real `<input type="color">`, same
 * invisible-real-input-under-a-decorative-swatch approach as
 * `@kernelui-lib/react`'s `<ColorPicker>` (see that file for the full
 * rationale). A real `<label>` wraps both the swatch and the input, so
 * clicking anywhere opens the OS picker natively.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `value` (default
 * `#000000`), `no-hex-input` (boolean — hides the editable hex field;
 * present by default the hex field shows, matching the React version's
 * `showHexInput` defaulting to `true`), `size` (sm/md/lg, default md),
 * `description`, `error-message`, `no-label-offset` (boolean — hard-
 * aligns the description and error text flush left instead of the
 * default inset; doesn't affect `label`, which never carries the inset
 * in the first place), `invalid`, `disabled`, `name`.
 */
export class KernelColorPicker extends KernelElement {
  private readonly generatedId = `kernel-color-picker-${++colorPickerCounter}`;
  private hexFocused = false;

  static get observedAttributes() {
    return [
      "label",
      "hide-label",
      "value",
      "no-hex-input",
      "size",
      "description",
      "error-message",
      "no-label-offset",
      "invalid",
      "disabled",
      "name",
    ];
  }

  connectedCallback() {
    if (this.native) return;
    const root = document.createElement("div");
    root.className = kernelClass("ColorPicker");
    root.dataset.size = "md";

    const id = this.getAttribute("id") || this.generatedId;

    const label = document.createElement("label");
    label.className = kernelClass("ColorPicker", "label");
    label.htmlFor = id;

    const controlRow = document.createElement("div");
    controlRow.className = kernelClass("ColorPicker", "controlRow");

    const swatchLabel = document.createElement("label");
    swatchLabel.className = kernelClass("ColorPicker", "swatchLabel");
    swatchLabel.htmlFor = id;

    const swatch = document.createElement("span");
    swatch.className = kernelClass("ColorPicker", "swatch");
    swatch.setAttribute("aria-hidden", "true");

    const colorInput = document.createElement("input");
    colorInput.id = id;
    colorInput.type = "color";
    colorInput.value = "#000000";
    colorInput.className = kernelClass("ColorPicker", "input");
    colorInput.addEventListener("input", () => {
      this.setAttribute("value", colorInput.value);
      this.dispatchEvent(new Event("change", { bubbles: true }));
    });

    swatchLabel.append(swatch, colorInput);

    const hexInput = document.createElement("input");
    hexInput.type = "text";
    hexInput.inputMode = "text";
    hexInput.spellcheck = false;
    hexInput.maxLength = 7;
    hexInput.setAttribute("aria-label", "Hex color value");
    hexInput.className = kernelClass("ColorPicker", "hexInput");
    hexInput.addEventListener("focus", () => {
      this.hexFocused = true;
    });
    hexInput.addEventListener("input", () => {
      const normalized = normalizeHex(hexInput.value);
      hexInput.setAttribute("aria-invalid", String(hexInput.value !== "" && !normalized));
      if (normalized) {
        this.setAttribute("value", normalized);
        this.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    hexInput.addEventListener("blur", () => {
      this.hexFocused = false;
      if (!normalizeHex(hexInput.value)) hexInput.value = colorInput.value;
    });
    hexInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") hexInput.blur();
    });

    controlRow.append(swatchLabel, hexInput);
    root.append(label, controlRow);
    this.native = root;
    this.append(root);
    this.syncAllAttrs();
    this.updateSwatch();
  }

  private get colorInput(): HTMLInputElement | null {
    return this.native?.querySelector(`.${kernelClass("ColorPicker", "input")}`) ?? null;
  }

  private get hexInput(): HTMLInputElement | null {
    return this.native?.querySelector(`.${kernelClass("ColorPicker", "hexInput")}`) ?? null;
  }

  private updateSwatch() {
    const swatch = this.native?.querySelector(`.${kernelClass("ColorPicker", "swatch")}`) as
      | HTMLElement
      | null;
    const value = this.colorInput?.value ?? "#000000";
    swatch?.style.setProperty("--swatch-color", value);
  }

  private updateDescribedBy() {
    const input = this.colorInput;
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
    const input = this.colorInput;
    if (!root || !input) return;
    root.querySelector(`.${kernelClass("ColorPicker", "description")}`)?.remove();
    root.querySelector(`.${kernelClass("ColorPicker", "error")}`)?.remove();

    const invalid = this.hasAttribute("invalid");
    const errorMessage = this.getAttribute("error-message");
    const description = this.getAttribute("description");

    if (invalid && errorMessage) {
      const p = document.createElement("p");
      p.className = kernelClass("ColorPicker", "error");
      p.id = `${input.id}-error`;
      p.setAttribute("role", "alert");
      p.textContent = errorMessage;
      root.append(p);
    } else if (description) {
      const p = document.createElement("p");
      p.className = kernelClass("ColorPicker", "description");
      p.id = `${input.id}-description`;
      p.textContent = description;
      root.append(p);
    }
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;

    switch (name) {
      case "label": {
        const labelEl = this.native.querySelector(`.${kernelClass("ColorPicker", "label")}`);
        if (labelEl) labelEl.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const labelEl = this.native.querySelector(`.${kernelClass("ColorPicker", "label")}`);
        labelEl?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "value": {
        const normalized = normalizeHex(value ?? "#000000") ?? "#000000";
        if (this.colorInput) this.colorInput.value = normalized;
        if (this.hexInput && !this.hexFocused) this.hexInput.value = normalized;
        this.updateSwatch();
        break;
      }
      case "no-hex-input":
        this.native.dataset.noHexInput = value !== null ? "true" : "";
        if (value === null) delete this.native.dataset.noHexInput;
        break;
      case "size":
        this.native.dataset.size = value ?? "md";
        break;
      case "disabled":
        if (this.colorInput) this.colorInput.disabled = value !== null;
        if (this.hexInput) this.hexInput.disabled = value !== null;
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
      case "name":
        if (this.colorInput) {
          if (value === null) this.colorInput.removeAttribute("name");
          else this.colorInput.name = value;
        }
        break;
    }
  }
}

customElements.define("kernel-color-picker", KernelColorPicker);
