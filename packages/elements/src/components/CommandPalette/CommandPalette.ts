import { KernelElement, dataAttr, kernelClass } from "../../base";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import "./CommandPalette.css";

let paletteCounter = 0;

export interface KernelCommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

/**
 * `<kernel-command-palette>` — a real `<dialog>`, opened with
 * `showModal()`, same reasoning as `<kernel-dialog>`: native top-layer
 * stacking, a native focus trap, native Escape-to-close. The filter
 * input follows the same WAI-ARIA combobox pattern as
 * `<kernel-combobox>`: a `role="listbox"` of `role="option"` items, an
 * `aria-activedescendant` pointing at whichever is highlighted, focus
 * staying on the input throughout.
 *
 * Enter/exit motion (opacity + slight scale + settle) is the default —
 * Escape and backdrop dismiss are held until the exit transition
 * finishes, matching `<kernel-dialog>`.
 *
 * Items carry an `onSelect` callback, which isn't expressible as an
 * HTML attribute — set them via the `items` property (not attribute):
 * `paletteEl.items = [{ id, label, description?, onSelect }]`.
 *
 * Attributes: `open` (toggle to show/hide), `placeholder` (default
 * "Filter commands"), `empty-message` (default "No results"), `blur`
 * (boolean — light frost on the `::backdrop`).
 */
export class KernelCommandPalette extends KernelElement {
  private readonly baseId = `kernel-command-palette-${++paletteCounter}`;
  private _items: KernelCommandPaletteItem[] = [];
  private query = "";
  private activeIndex = 0;
  private closing = false;
  private skipCloseEvent = false;
  private exitAbort: AbortController | null = null;

  private inputEl!: HTMLInputElement;
  private listboxEl!: HTMLElement;

  static get observedAttributes() {
    return ["open", "placeholder", "empty-message", "blur"];
  }

  get items(): KernelCommandPaletteItem[] {
    return this._items;
  }

  set items(value: KernelCommandPaletteItem[]) {
    this._items = value;
    if (this.native) this.renderOptions();
  }

  private get filtered(): KernelCommandPaletteItem[] {
    const q = this.query.toLowerCase();
    return this._items.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        (item.description?.toLowerCase().includes(q) ?? false),
    );
  }

  connectedCallback() {
    if (this.native) return;

    const dialog = document.createElement("dialog");
    dialog.className = kernelClass("CommandPalette", "content");
    dialog.setAttribute("aria-label", "Command palette");
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) this.requestClose();
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.requestClose();
    });
    dialog.addEventListener("close", () => {
      if (this.skipCloseEvent) {
        this.skipCloseEvent = false;
        return;
      }
      this.removeAttribute("open");
    });

    const input = document.createElement("input");
    input.type = "text";
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-expanded", "true");
    input.setAttribute("aria-controls", `${this.baseId}-listbox`);
    input.setAttribute("aria-autocomplete", "list");
    input.autocomplete = "off";
    input.className = kernelClass("CommandPalette", "input");
    input.addEventListener("input", () => {
      this.query = input.value;
      this.activeIndex = 0;
      this.renderOptions();
    });
    input.addEventListener("keydown", (event) => this.handleKeyDown(event));
    this.inputEl = input;

    const listbox = document.createElement("div");
    listbox.id = `${this.baseId}-listbox`;
    listbox.setAttribute("role", "listbox");
    listbox.className = kernelClass("CommandPalette", "listbox");
    this.listboxEl = listbox;

    dialog.append(input, listbox);
    this.native = dialog;
    this.append(dialog);
    this.syncAllAttrs();
    this.renderOptions();
  }

  private requestClose() {
    if (!this.hasAttribute("open") || this.closing) return;
    this.removeAttribute("open");
  }

  private async finishClose(dialog: HTMLDialogElement) {
    if (!dialog.open || this.closing) return;
    this.closing = true;
    dialog.removeAttribute("data-open");
    dialog.setAttribute("data-closing", "");

    if (!prefersReducedMotion()) {
      const controller = new AbortController();
      this.exitAbort?.abort();
      this.exitAbort = controller;
      await waitForExitTransition(dialog, { signal: controller.signal });
      if (controller.signal.aborted) {
        this.closing = false;
        return;
      }
    }

    this.skipCloseEvent = true;
    dialog.close();
    dialog.removeAttribute("data-closing");
    this.closing = false;
  }

  private handleKeyDown(event: KeyboardEvent) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        this.activeIndex = Math.min(this.activeIndex + 1, this.filtered.length - 1);
        this.renderOptions();
        break;
      case "ArrowUp":
        event.preventDefault();
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.renderOptions();
        break;
      case "Enter": {
        const active = this.filtered[this.activeIndex];
        if (active) {
          event.preventDefault();
          this.selectItem(active);
        }
        break;
      }
    }
  }

  private selectItem(item: KernelCommandPaletteItem) {
    item.onSelect();
    this.requestClose();
  }

  private renderOptions() {
    const filtered = this.filtered;
    this.listboxEl.replaceChildren();

    if (filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = kernelClass("CommandPalette", "empty");
      empty.textContent = this.getAttribute("empty-message") || "No results";
      this.listboxEl.append(empty);
      this.inputEl.removeAttribute("aria-activedescendant");
      return;
    }

    filtered.forEach((item, index) => {
      const option = document.createElement("div");
      option.id = `${this.baseId}-listbox-option-${index}`;
      option.setAttribute("role", "option");
      option.setAttribute("aria-selected", String(index === this.activeIndex));
      const active = dataAttr(index === this.activeIndex);
      if (active) option.setAttribute("data-active", active);
      option.className = kernelClass("CommandPalette", "option");

      const label = document.createElement("div");
      label.className = kernelClass("CommandPalette", "optionLabel");
      label.textContent = item.label;
      option.append(label);

      if (item.description) {
        const description = document.createElement("div");
        description.className = kernelClass("CommandPalette", "optionDescription");
        description.textContent = item.description;
        option.append(description);
      }

      option.addEventListener("pointerdown", (event) => event.preventDefault());
      option.addEventListener("pointermove", () => {
        this.activeIndex = index;
        this.renderOptions();
      });
      option.addEventListener("click", () => this.selectItem(item));

      this.listboxEl.append(option);
      if (index === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", option.id);
    });
  }

  protected syncAttr(name: string, value: string | null) {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;

    switch (name) {
      case "open":
        if (value !== null && !dialog.open) {
          this.exitAbort?.abort();
          this.closing = false;
          dialog.removeAttribute("data-closing");
          this.query = "";
          this.activeIndex = 0;
          this.inputEl.value = "";
          this.renderOptions();
          dialog.showModal();
          dialog.setAttribute("data-open", "");
          requestAnimationFrame(() => this.inputEl.focus());
        }
        if (value === null && dialog.open) {
          void this.finishClose(dialog);
        }
        break;
      case "placeholder":
        this.inputEl.placeholder = value || "Filter commands";
        this.inputEl.setAttribute("aria-label", value || "Filter commands");
        break;
      case "empty-message":
        this.renderOptions();
        break;
      case "blur": {
        const blurred = dataAttr(value !== null);
        if (blurred) dialog.setAttribute("data-blur", blurred);
        else dialog.removeAttribute("data-blur");
        break;
      }
    }
  }

  disconnectedCallback() {
    this.exitAbort?.abort();
  }
}

customElements.define("kernel-command-palette", KernelCommandPalette);
