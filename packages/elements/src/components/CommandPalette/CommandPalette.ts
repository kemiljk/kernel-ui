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

export interface KernelCommandPaletteGroup {
  id: string;
  label?: string;
  items: KernelCommandPaletteItem[];
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
  private _groups: KernelCommandPaletteGroup[] = [];
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

  get groups(): KernelCommandPaletteGroup[] {
    return this._groups;
  }

  set groups(value: KernelCommandPaletteGroup[]) {
    this._groups = value;
    if (this.native) this.renderOptions();
  }

  private get isGrouped(): boolean {
    return this._groups.length > 0;
  }

  private get filteredGroups(): KernelCommandPaletteGroup[] {
    const sourceGroups = this.isGrouped ? this._groups : [{ id: "__items__", items: this._items }];
    return sourceGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => {
        const q = this.query.toLowerCase();
        return item.label.toLowerCase().includes(q) || (item.description?.toLowerCase().includes(q) ?? false);
      }) }))
      .filter((group) => group.items.length > 0);
  }

  get filtered(): Array<{ item: KernelCommandPaletteItem; group?: KernelCommandPaletteGroup; flatIndex: number }> {
    const entries: Array<{ item: KernelCommandPaletteItem; group?: KernelCommandPaletteGroup; flatIndex: number }> = [];
    for (const group of this.filteredGroups) {
      for (const item of group.items) {
        entries.push({ item, group: this.isGrouped ? group : undefined, flatIndex: entries.length });
      }
    }
    return entries;
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

  set renderItem(value: ((item: KernelCommandPaletteItem, state: { active: boolean; group?: KernelCommandPaletteGroup; index: number }) => HTMLElement | DocumentFragment | string | null) | undefined) {
    this._renderItem = value;
    if (this.native) this.renderOptions();
  }

  get renderItem() {
    return this._renderItem;
  }

  private _renderItem?: ((item: KernelCommandPaletteItem, state: { active: boolean; group?: KernelCommandPaletteGroup; index: number }) => HTMLElement | DocumentFragment | string | null);

  private requestClose() {
    if (!this.hasAttribute("open") || this.closing) return;
    this.removeAttribute("open");
  }

  private async finishClose(dialog: HTMLDialogElement) {
    if (!dialog.open || this.closing) return;
    this.closing = true;
    dialog.setAttribute("data-state", "closing");

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
    dialog.removeAttribute("data-state");
    this.closing = false;
  }

  private handleKeyDown(event: KeyboardEvent) {
    const maxIndex = this.filtered.length - 1;
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (maxIndex < 0) break;
        this.activeIndex = Math.min(this.activeIndex + 1, maxIndex);
        this.renderOptions();
        this.scrollActiveIntoView();
        break;
      case "ArrowUp":
        event.preventDefault();
        if (maxIndex < 0) break;
        this.activeIndex = Math.max(this.activeIndex - 1, 0);
        this.renderOptions();
        this.scrollActiveIntoView();
        break;
      case "Enter": {
        const active = this.filtered[this.activeIndex]?.item;
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

  /** Keyboard nav only — hover already puts the pointer where it needs to
   * be, so scrolling under it there would fight the user instead of
   * helping. */
  private scrollActiveIntoView() {
    if (this.activeIndex < 0) return;
    this.listboxEl
      .querySelector(`[id="${this.baseId}-listbox-option-${this.activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }

  private renderOptions() {
    const filteredGroups = this.filteredGroups;
    this.listboxEl.replaceChildren();

    if (filteredGroups.length === 0) {
      const empty = document.createElement("div");
      empty.className = kernelClass("CommandPalette", "empty");
      empty.textContent = this.getAttribute("empty-message") || "No results";
      this.listboxEl.append(empty);
      this.inputEl.removeAttribute("aria-activedescendant");
      return;
    }

    let flatIndex = 0;
    for (const group of filteredGroups) {
      const headerId = group.label ? `${this.baseId}-listbox-group-${group.id}` : undefined;
      let groupEl: HTMLElement = this.listboxEl;

      if (headerId) {
        groupEl = document.createElement("div");
        groupEl.setAttribute("role", "group");
        groupEl.setAttribute("aria-labelledby", headerId);

        const header = document.createElement("div");
        header.id = headerId;
        header.setAttribute("role", "presentation");
        header.className = kernelClass("CommandPalette", "groupLabel");
        header.textContent = group.label ?? "";
        groupEl.append(header);
        this.listboxEl.append(groupEl);
      }

      for (const item of group.items) {
        const currentIndex = flatIndex++;
        const option = document.createElement("div");
        option.id = `${this.baseId}-listbox-option-${currentIndex}`;
        option.setAttribute("role", "option");
        option.setAttribute("aria-selected", String(currentIndex === this.activeIndex));
        const active = dataAttr(currentIndex === this.activeIndex);
        if (active) option.setAttribute("data-active", active);
        option.className = kernelClass("CommandPalette", "option");

        const content = this.renderItem?.(item, {
          active: currentIndex === this.activeIndex,
          group: this.isGrouped ? group : undefined,
          index: currentIndex,
        });
        if (content !== undefined && content !== null && typeof content !== "string") {
          option.append(content as Node);
        } else {
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
        }

        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("pointermove", () => {
          this.activeIndex = currentIndex;
          this.renderOptions();
        });
        option.addEventListener("click", () => this.selectItem(item));

        groupEl.append(option);
        if (currentIndex === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", option.id);
      }
    }
  }

  protected syncAttr(name: string, value: string | null) {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;

    switch (name) {
      case "open":
        if (value !== null && !dialog.open) {
          this.exitAbort?.abort();
          this.closing = false;
          this.query = "";
          this.activeIndex = 0;
          this.inputEl.value = "";
          this.renderOptions();
          dialog.showModal();
          dialog.setAttribute("data-state", "open");
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
