import { KernelElement, dataAttr, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import "./Combobox.css";

let comboboxCounter = 0;

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxGroup {
  id: string;
  label?: string;
  items: ComboboxOption[];
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
 * `hide-label` is set), `hide-label` (boolean), `no-label-offset`
 * (boolean — hard-aligns the label flush left instead of the default
 * inset that lines it up with the input's own text padding),
 * `placeholder`, `value`, `empty-message` (default "No results"),
 * `placement` (default bottom), `align` (start/center/end, default
 * center), `offset` (px, default 8).
 * Events: `valuechange` (`event.detail.value`).
 */
export class KernelCombobox extends KernelElement {
  private readonly baseId = `kernel-combobox-${++comboboxCounter}`;
  private readonly positioner = new FloatingPositioner();
  private options: ComboboxOption[] = [];
  private groups: ComboboxGroup[] = [];
  private filtered: Array<{ option: ComboboxOption; group?: ComboboxGroup; flatIndex: number }> = [];
  private selectedValue = "";
  private inputText = "";
  private open = false;
  private activeIndex = -1;

  private inputEl!: HTMLInputElement;
  private listboxEl!: HTMLElement;
  private readonly onDocumentPointerDown = (event: PointerEvent) => {
    if (!this.open) return;
    if (!this.contains(event.target as Node)) this.closeList();
  };

  static get observedAttributes() {
    return ["label", "hide-label", "no-label-offset", "placeholder", "value"];
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
    this.filtered = [];

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
    listbox.setAttribute("data-slot", "combobox-listbox");
    listbox.className = kernelClass("Combobox", "listbox");
    this.listboxEl = listbox;

    const { placement, align, offset } = readFloatingAttributes(this);
    listbox.setAttribute("data-placement", placement);
    listbox.setAttribute("data-align", align);

    this.positioner.attach(input, listbox, { placement, align, offset });

    input.addEventListener("focus", () => this.openList());
    input.addEventListener("input", () => {
      this.inputText = input.value;
      this.activeIndex = 0;
      this.openList();
      this.renderOptions();
    });
    input.addEventListener("keydown", (event) => this.handleKeyDown(event));

    document.addEventListener("pointerdown", this.onDocumentPointerDown);

    root.append(label, input);
    this.native = root;
    this.append(root, listbox);
    this.renderOptions();
    this.syncAllAttrs();
  }

  set renderOption(value: ((option: ComboboxOption, state: { active: boolean; selected: boolean; group?: ComboboxGroup; index: number }) => HTMLElement | DocumentFragment | string | null) | undefined) {
    this._renderOption = value;
    if (this.native) this.renderOptions();
  }

  get renderOption() {
    return this._renderOption;
  }

  private _renderOption?: ((option: ComboboxOption, state: { active: boolean; selected: boolean; group?: ComboboxGroup; index: number }) => HTMLElement | DocumentFragment | string | null);

  private openList() {
    if (this.open) return;
    this.open = true;
    this.inputEl.setAttribute("aria-expanded", "true");
    this.listboxEl.setAttribute("data-open", "");
    this.listboxEl.showPopover?.();
    this.positioner.setOpen(true);
  }

  private closeList() {
    this.open = false;
    this.activeIndex = -1;
    this.inputEl.setAttribute("aria-expanded", "false");
    this.inputEl.removeAttribute("aria-activedescendant");
    this.listboxEl.removeAttribute("data-open");
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
    const maxIndex = this.filtered.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!this.open) {
          this.openList();
          this.activeIndex = maxIndex >= 0 ? 0 : -1;
        } else if (maxIndex >= 0) {
          this.activeIndex = Math.min(this.activeIndex + 1, maxIndex);
        }
        this.renderOptions();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (maxIndex < 0) break;
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.renderOptions();
        break;
      case "Enter": {
        const active = this.filtered[this.activeIndex]?.option;
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
    const sourceGroups = this.groups.length > 0 ? this.groups : [{ id: "__items__", items: this.options }];
    const filteredGroups = sourceGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((option) => option.label.toLowerCase().includes(this.inputText.toLowerCase())),
      }))
      .filter((group) => group.items.length > 0);

    const entries: Array<{ option: ComboboxOption; group?: ComboboxGroup; flatIndex: number }> = [];
    for (const group of filteredGroups) {
      for (const option of group.items) {
        entries.push({ option, group, flatIndex: entries.length });
      }
    }
    this.filtered = entries;
    this.listboxEl.replaceChildren();

    if (this.filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = kernelClass("Combobox", "empty");
      empty.textContent = this.getAttribute("empty-message") || "No results";
      this.listboxEl.append(empty);
      return;
    }

    let previousGroupId: string | undefined;
    this.filtered.forEach(({ option, group, flatIndex }) => {
      if (group?.label && group.id !== previousGroupId) {
        const header = document.createElement("div");
        header.className = kernelClass("Combobox", "groupLabel");
        header.textContent = group.label;
        this.listboxEl.append(header);
        previousGroupId = group.id;
      }

      const div = document.createElement("div");
      div.id = `${this.baseId}-listbox-option-${flatIndex}`;
      div.setAttribute("role", "option");
      div.setAttribute("aria-selected", String(option.value === this.selectedValue));
      const active = dataAttr(flatIndex === this.activeIndex);
      if (active) div.setAttribute("data-active", active);
      div.className = kernelClass("Combobox", "option");

      const content = this._renderOption?.(option, {
        active: flatIndex === this.activeIndex,
        selected: option.value === this.selectedValue,
        group,
        index: flatIndex,
      });
      if (content !== undefined && content !== null && typeof content !== "string") {
        div.append(content as Node);
      } else {
        div.textContent = typeof content === "string" ? content : option.label;
      }

      div.addEventListener("pointerdown", (event) => event.preventDefault());
      div.addEventListener("pointermove", () => {
        this.activeIndex = flatIndex;
        this.renderOptions();
      });
      div.addEventListener("click", () => this.selectOption(option));
      this.listboxEl.append(div);
      if (flatIndex === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", div.id);
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
      case "no-label-offset":
        if (value !== null) this.native.setAttribute("data-label-offset", "false");
        else this.native.removeAttribute("data-label-offset");
        break;
      case "placeholder":
        this.inputEl.placeholder = value ?? "";
        break;
      case "value":
        this.selectedValue = value ?? "";
        this.renderOptions();
        break;
    }
  }

  disconnectedCallback() {
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
    // Drops the fallback path's window scroll/resize listeners if the
    // combobox is removed while its listbox is open (otherwise they leak,
    // referencing a detached element, on browsers without CSS anchor
    // positioning).
    this.positioner.destroy();
  }
}

customElements.define("kernel-combobox", KernelCombobox);
