import { FORWARDED_ARIA_ATTRIBUTES, KernelElement, dataAttr, kernelClass } from "../../base";
import { inputModality } from "../../utils/changeDetails";
import { fuzzyScore, fuzzySegments } from "../../utils/fuzzy";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
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
 * Events: `valuechange` (`event.detail.value`), dispatched before the
 * selection changes with `detail.reason` — `"item-press"`, `"keyboard"`
 * (Enter on the highlighted option) or `"clear"` (the text field emptied).
 * It's cancelable: `preventDefault()` keeps the current selection.
 *
 * Filtering is a ranked fuzzy match (`fuzzyScore`): best matches first
 * within each group, matched characters wrapped in `<mark>`. Set the
 * `filter` property to `(text, query) => number` to replace it (a score
 * above 0 keeps an option, higher first).
 *
 * `aria-label`, `aria-labelledby` and `aria-describedby` on the host are
 * forwarded to the inner `<input role="combobox">`.
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
  /** Replaces the built-in fuzzy match: a score above 0 keeps an option,
   * higher ranks first; 0 hides it. */
  filter: ((text: string, query: string) => number) | undefined;

  private inputEl!: HTMLInputElement;
  private listboxEl!: HTMLElement;
  private readonly onDocumentPointerDown = (event: PointerEvent) => {
    if (!this.open) return;
    if (!this.contains(event.target as Node)) this.closeList();
  };

  static get observedAttributes() {
    return [...FORWARDED_ARIA_ATTRIBUTES, "label", "hide-label", "no-label-offset", "placeholder", "value"];
  }

  protected ariaTarget() {
    return this.inputEl ?? null;
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
    input.addEventListener("input", (event) => {
      this.inputText = input.value;
      this.activeIndex = 0;
      this.openList();
      // Emptying the field clears the selection rather than leaving a value
      // selected behind a blank input.
      if (input.value === "" && this.selectedValue !== "") {
        if (this.emitChange("valuechange", { value: "" }, "clear", event)) this.selectedValue = "";
      }
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
    this.listboxEl.setAttribute("data-open", "true");
    this.listboxEl.removeAttribute("data-closing");
    this.listboxEl.showPopover?.();
    this.positioner.setOpen(true);
  }

  private closeList() {
    this.open = false;
    this.activeIndex = -1;
    this.inputEl.setAttribute("aria-expanded", "false");
    this.inputEl.removeAttribute("aria-activedescendant");
    this.listboxEl.removeAttribute("data-open");
    // Play the exit before hiding, the same as React's usePopoverExit.
    const listbox = this.listboxEl;
    if (prefersReducedMotion() || !listbox.matches(":popover-open")) {
      listbox.hidePopover?.();
      this.positioner.setOpen(false);
      return;
    }
    listbox.setAttribute("data-closing", "true");
    void waitForExitTransition(listbox).then(() => {
      listbox.removeAttribute("data-closing");
      // Reopened while closing: leave it open.
      if (this.open) return;
      listbox.hidePopover?.();
      this.positioner.setOpen(false);
    });
  }

  private selectOption(option: ComboboxOption, event?: Event) {
    const reason = inputModality(event) === "keyboard" ? "keyboard" : "item-press";
    if (!this.emitChange("valuechange", { value: option.value }, reason, event)) return;
    this.selectedValue = option.value;
    this.inputText = option.label;
    this.inputEl.value = option.label;
    this.closeList();
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
        const active = this.filtered[this.activeIndex]?.option;
        if (this.open && active) {
          event.preventDefault();
          this.selectOption(active, event);
        }
        break;
      }
      case "Escape":
        this.closeList();
        break;
    }
  }

  private renderOptions() {
    const isGrouped = this.groups.length > 0;
    const sourceGroups = isGrouped ? this.groups : [{ id: "__items__", items: this.options }];
    const query = this.inputText;
    const ranked = query.trim() !== "";
    // Ranked fuzzy match, best first within each group; the DOM order is
    // the ranked order, so arrow keys and screen readers agree with the eye.
    const matches = new Map<ComboboxOption, Array<[number, number]>>();
    const filteredGroups = sourceGroups
      .map((group) => {
        const scored: Array<{ option: ComboboxOption; score: number; index: number }> = [];
        group.items.forEach((option, index) => {
          if (!ranked) {
            scored.push({ option, score: 0, index });
            return;
          }
          if (this.filter) {
            const score = this.filter(option.label, query);
            if (score > 0) scored.push({ option, score, index });
            return;
          }
          const match = fuzzyScore(query, option.label);
          if (match) {
            scored.push({ option, score: match.score, index });
            matches.set(option, match.ranges);
          }
        });
        if (ranked) scored.sort((a, b) => b.score - a.score || a.index - b.index);
        return { ...group, items: scored.map((entry) => entry.option) };
      })
      .filter((group) => group.items.length > 0);

    const entries: Array<{ option: ComboboxOption; group?: ComboboxGroup; flatIndex: number }> = [];
    for (const group of filteredGroups) {
      for (const option of group.items) {
        entries.push({ option, group: isGrouped ? group : undefined, flatIndex: entries.length });
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
        header.className = kernelClass("Combobox", "groupLabel");
        header.textContent = group.label ?? "";
        groupEl.append(header);
        this.listboxEl.append(groupEl);
      }

      for (const option of group.items) {
        const currentIndex = flatIndex++;
        const div = document.createElement("div");
        div.id = `${this.baseId}-listbox-option-${currentIndex}`;
        div.setAttribute("role", "option");
        div.setAttribute("aria-selected", String(option.value === this.selectedValue));
        const active = dataAttr(currentIndex === this.activeIndex);
        if (active) div.setAttribute("data-active", active);
        div.className = kernelClass("Combobox", "option");

        const content = this._renderOption?.(option, {
          active: currentIndex === this.activeIndex,
          selected: option.value === this.selectedValue,
          group: isGrouped ? group : undefined,
          index: currentIndex,
        });
        if (content !== undefined && content !== null && typeof content !== "string") {
          div.append(content as Node);
        } else if (typeof content === "string") {
          div.textContent = content;
        } else {
          for (const segment of fuzzySegments(option.label, matches.get(option) ?? [])) {
            if (!segment.match) {
              div.append(segment.text);
              continue;
            }
            const mark = document.createElement("mark");
            mark.className = kernelClass("Combobox", "match");
            mark.textContent = segment.text;
            div.append(mark);
          }
        }

        div.addEventListener("pointerdown", (event) => event.preventDefault());
        div.addEventListener("pointermove", () => {
          // Only on a change: re-rendering replaces every option node, and
          // doing it for each move within one option swapped the node out
          // between pointerdown and pointerup, so the click never landed.
          if (this.activeIndex === currentIndex) return;
          this.activeIndex = currentIndex;
          this.renderOptions();
        });
        div.addEventListener("click", (event) => this.selectOption(option, event));
        groupEl.append(div);
        if (currentIndex === this.activeIndex) this.inputEl.setAttribute("aria-activedescendant", div.id);
      }
    }
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
