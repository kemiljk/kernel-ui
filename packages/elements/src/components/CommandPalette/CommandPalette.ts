import { KernelElement, dataAttr, kernelClass } from "../../base";
import { inputModality } from "../../utils/changeDetails";
import { fuzzyFilter, fuzzySegments } from "../../utils/fuzzy";
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
 * Opening and closing are immediate because this keyboard-driven surface
 * should respond in the same frame as its shortcut.
 *
 * Items carry an `onSelect` callback, which isn't expressible as an
 * HTML attribute — set them via the `items` property (not attribute):
 * `paletteEl.items = [{ id, label, description?, onSelect }]`.
 *
 * Attributes: `open` (toggle to show/hide), `placeholder` (default
 * "Filter commands"), `empty-message` (default "No results"), `blur`
 * (boolean — light frost on the `::backdrop`), and the built-in string
 * `label-dialog` (default "Command palette") — or the `labels` property.
 *
 * Closing dispatches a bubbling, cancelable `cancel` event first (the
 * native `<dialog>`'s name for "about to close", as on `kernel-dialog`), with
 * `detail.reason` — `"escape-key"`, `"outside-press"`, `"item-press"`,
 * `"item-keyboard"` or `"programmatic"` (the native dialog closing some
 * other way). `preventDefault()` keeps the palette open; an item's
 * `onSelect` still runs.
 *
 * Filtering is a ranked fuzzy match over each item's label and
 * description (`fuzzyFilter`): best matches first within each group, the
 * matched characters wrapped in `<mark>`. Set the `filter` property to
 * `(text, query) => number` to replace it (above 0 keeps an item).
 */
export class KernelCommandPalette extends KernelElement {
  private readonly baseId = `kernel-command-palette-${++paletteCounter}`;
  private _items: KernelCommandPaletteItem[] = [];
  private _groups: KernelCommandPaletteGroup[] = [];
  private query = "";
  private activeIndex = 0;
  /** Replaces the built-in fuzzy match: a score above 0 keeps an item,
   * higher ranks first; 0 hides it. Called with `label description`. */
  filter: ((text: string, query: string) => number) | undefined;
  /** Matched spans per item for the current query: which text (0 label,
   * 1 description) and where. */
  private matchRanges = new Map<KernelCommandPaletteItem, { field: number; ranges: Array<[number, number]> }>();
  private inputEl!: HTMLInputElement;
  private listboxEl!: HTMLElement;

  static get observedAttributes() {
    return ["open", "placeholder", "empty-message", "blur", "label-dialog"];
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
    this.matchRanges = new Map();
    const query = this.query;
    if (query.trim() === "") return sourceGroups.filter((group) => group.items.length > 0);
    return sourceGroups
      .map((group) => {
        if (this.filter) {
          const filter = this.filter;
          const scored = group.items
            .map((item, index) => ({ item, index, score: filter(`${item.label} ${item.description ?? ""}`, query) }))
            .filter((entry) => entry.score > 0)
            .sort((a, b) => b.score - a.score || a.index - b.index);
          return { ...group, items: scored.map((entry) => entry.item) };
        }
        const ranked = fuzzyFilter(group.items, query, (item) => [item.label, item.description ?? ""]);
        for (const result of ranked) this.matchRanges.set(result.item, { field: result.field, ranges: result.ranges });
        return { ...group, items: ranked.map((result) => result.item) };
      })
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
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) this.requestClose("outside-press", event);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.requestClose("escape-key", event);
    });
    dialog.addEventListener("close", (event) => {
      if (!this.hasAttribute("open")) return;
      // Closed natively some other way: ask, and re-open on a veto.
      if (this.emitChange("cancel", {}, "programmatic", event)) this.removeAttribute("open");
      else dialog.showModal();
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

  private requestClose(
    reason: "escape-key" | "outside-press" | "item-press" | "item-keyboard",
    event?: Event,
  ) {
    if (!this.hasAttribute("open")) return;
    if (!this.emitChange("cancel", {}, reason, event)) return;
    this.removeAttribute("open");
  }

  /** `text` into `parent`, matched spans wrapped in `<mark>`. */
  private appendHighlighted(parent: HTMLElement, text: string, ranges: Array<[number, number]>) {
    for (const segment of fuzzySegments(text, ranges)) {
      if (!segment.match) {
        parent.append(segment.text);
        continue;
      }
      const mark = document.createElement("mark");
      mark.className = kernelClass("CommandPalette", "match");
      mark.textContent = segment.text;
      parent.append(mark);
    }
  }

  private finishClose(dialog: HTMLDialogElement) {
    if (dialog.open) dialog.close();
    dialog.removeAttribute("data-open");
    dialog.removeAttribute("data-state");
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
          this.selectItem(active, event);
        }
        break;
      }
    }
  }

  private selectItem(item: KernelCommandPaletteItem, event?: Event) {
    item.onSelect();
    this.requestClose(inputModality(event) === "keyboard" ? "item-keyboard" : "item-press", event);
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
          const match = this.matchRanges.get(item);
          const label = document.createElement("div");
          label.className = kernelClass("CommandPalette", "optionLabel");
          this.appendHighlighted(label, item.label, match?.field === 0 ? match.ranges : []);
          option.append(label);

          if (item.description) {
            const description = document.createElement("div");
            description.className = kernelClass("CommandPalette", "optionDescription");
            this.appendHighlighted(description, item.description, match?.field === 1 ? match.ranges : []);
            option.append(description);
          }
        }

        option.addEventListener("pointerdown", (event) => event.preventDefault());
        option.addEventListener("pointermove", () => {
          this.activeIndex = currentIndex;
          this.renderOptions();
        });
        option.addEventListener("click", (event) => this.selectItem(item, event));

        groupEl.append(option);
        if (currentIndex === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", option.id);
      }
    }
  }

  protected applyLabels() {
    this.native?.setAttribute("aria-label", this.builtInLabel("dialog", "Command palette"));
  }

  protected syncAttr(name: string, value: string | null) {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;

    switch (name) {
      case "open":
        if (value !== null && !dialog.open) {
          this.query = "";
          this.activeIndex = 0;
          this.inputEl.value = "";
          this.renderOptions();
          dialog.showModal();
          dialog.setAttribute("data-open", "true");
          dialog.setAttribute("data-state", "open");
          requestAnimationFrame(() => this.inputEl.focus());
        }
        if (value === null && dialog.open) {
          this.finishClose(dialog);
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

}

customElements.define("kernel-command-palette", KernelCommandPalette);
