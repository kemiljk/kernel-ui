import { KernelElement, dataAttr, kernelClass } from "../../base";
import { FloatingPositioner } from "../../utils/floatingPosition";
import "./Combobox.css";

let comboboxCounter = 0;

interface ComboboxOption {
  value: string;
  label: string;
}

/**
 * `<kernel-combobox>` — the WAI-ARIA 1.2 combobox pattern: a real
 * `<input role="combobox">` that keeps DOM focus the whole time, an
 * `aria-activedescendant` pointing at whichever option is highlighted
 * (the highlight moves, focus doesn't), and a `role="listbox"` popup.
 * `popover="manual"` is used deliberately — this needs its own
 * open/close rules (open on focus or typing, not just a click), so
 * light-dismiss is handled by hand: Escape in the keydown handler,
 * outside-click via a `pointerdown` listener.
 *
 * Options are declared as real `<option>` children (same convention
 * as `<kernel-select>`), moved out of the light DOM at connect and
 * rendered as the listbox's own `role="option"` divs.
 *
 * Attributes: `label` (required, still the accessible name even when
 * `hide-label` is set), `hide-label` (boolean), `placeholder`, `value`,
 * `empty-message` (default "No results").
 * Events: `valuechange` (`event.detail.value`).
 */
export class KernelCombobox extends KernelElement {
  private readonly baseId = `kernel-combobox-${++comboboxCounter}`;
  private readonly positioner = new FloatingPositioner();
  private options: ComboboxOption[] = [];
  private filtered: ComboboxOption[] = [];
  private selectedValue = "";
  private inputText = "";
  private open = false;
  private activeIndex = -1;

  private inputEl!: HTMLInputElement;
  private listboxEl!: HTMLElement;

  static get observedAttributes() {
    return ["label", "hide-label", "placeholder", "value"];
  }

  connectedCallback() {
    if (this.native) return;

    this.options = Array.from(this.querySelectorAll("option")).map((option) => ({
      value: option.value,
      label: option.textContent ?? "",
    }));
    for (const option of Array.from(this.querySelectorAll("option"))) option.remove();

    this.selectedValue = this.getAttribute("value") ?? "";
    const selectedOption = this.options.find((o) => o.value === this.selectedValue);
    this.inputText = selectedOption?.label ?? "";
    this.filtered = this.options;

    const root = document.createElement("div");
    root.className = kernelClass("Combobox");

    const label = document.createElement("label");
    label.className = kernelClass("Combobox", "label");
    label.htmlFor = this.baseId;
    label.textContent = this.getAttribute("label") ?? "";

    const input = document.createElement("input");
    input.id = this.baseId;
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "false");
    input.setAttribute("aria-controls", `${this.baseId}-listbox`);
    input.setAttribute("aria-autocomplete", "list");
    input.autocomplete = "off";
    input.className = kernelClass("Combobox", "input");
    input.value = this.inputText;
    input.placeholder = this.getAttribute("placeholder") ?? "";
    this.inputEl = input;

    const listbox = document.createElement("div");
    listbox.id = `${this.baseId}-listbox`;
    listbox.setAttribute("role", "listbox");
    listbox.setAttribute("popover", "manual");
    listbox.className = kernelClass("Combobox", "listbox");
    this.listboxEl = listbox;

    this.positioner.attach(input, listbox, { placement: "bottom" });

    input.addEventListener("focus", () => this.openList());
    input.addEventListener("input", () => {
      this.inputText = input.value;
      this.activeIndex = 0;
      this.openList();
      this.renderOptions();
    });
    input.addEventListener("keydown", (event) => this.handleKeyDown(event));

    document.addEventListener("pointerdown", (event) => {
      if (!this.open) return;
      if (!root.contains(event.target as Node)) this.closeList();
    });

    root.append(label, input);
    this.native = root;
    this.append(root, listbox);
    this.renderOptions();
    this.syncAllAttrs();
  }

  private openList() {
    if (this.open) return;
    this.open = true;
    this.inputEl.setAttribute("aria-expanded", "true");
    this.listboxEl.showPopover?.();
    this.positioner.setOpen(true);
  }

  private closeList() {
    this.open = false;
    this.activeIndex = -1;
    this.inputEl.setAttribute("aria-expanded", "false");
    this.inputEl.removeAttribute("aria-activedescendant");
    this.listboxEl.hidePopover?.();
    this.positioner.setOpen(false);
  }

  private selectOption(option: ComboboxOption) {
    this.selectedValue = option.value;
    this.inputText = option.label;
    this.inputEl.value = option.label;
    this.closeList();
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value: option.value }, bubbles: true }));
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!this.open) {
          this.openList();
          this.activeIndex = 0;
        } else {
          this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
        }
        this.renderOptions();
        break;
      case "ArrowUp":
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.renderOptions();
        break;
      case "Enter": {
        const active = this.filtered[this.activeIndex];
        if (this.open && active) {
          event.preventDefault();
          this.selectOption(active);
        }
        break;
      }
      case "Escape":
        this.closeList();
        break;
    }
  }

  private renderOptions() {
    this.filtered = this.options.filter((option) =>
      option.label.toLowerCase().includes(this.inputText.toLowerCase()),
    );
    this.listboxEl.replaceChildren();

    if (this.filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = kernelClass("Combobox", "empty");
      empty.textContent = this.getAttribute("empty-message") || "No results";
      this.listboxEl.append(empty);
      return;
    }

    this.filtered.forEach((option, index) => {
      const div = document.createElement("div");
      div.id = `${this.baseId}-listbox-option-${index}`;
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", String(option.value === this.selectedValue));
      const active = dataAttr(index === this.activeIndex);
      if (active) div.setAttribute("data-active", active);
      div.className = kernelClass("Combobox", "option");
      div.textContent = option.label;
      div.addEventListener("pointerdown", (event) => event.preventDefault());
      div.addEventListener("click", () => this.selectOption(option));
      this.listboxEl.append(div);
      if (index === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", div.id);
    });
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    switch (name) {
      case "label": {
        const label = this.native.querySelector("label");
        if (label) label.textContent = value ?? "";
        break;
      }
      case "hide-label": {
        const label = this.native.querySelector("label");
        label?.classList.toggle("kernel-sr-only", value !== null);
        break;
      }
      case "placeholder":
        this.inputEl.placeholder = value ?? "";
        break;
      case "value":
        this.selectedValue = value ?? "";
        this.renderOptions();
        break;
    }
  }
}

customElements.define("kernel-combobox", KernelCombobox);
