import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import "../Badge/Badge.css";
import "./ModelPicker.css";

const cls = (part: string) => kernelClass("ModelPicker", part);
const SVG_NS = "http://www.w3.org/2000/svg";
const TYPEAHEAD_RESET_MS = 500;
const BADGE_VARIANTS = new Set(["neutral", "accent", "success", "warning", "danger"]);

export type ModelPickerBadgeVariant = "neutral" | "accent" | "success" | "warning" | "danger";
export type ModelPickerBadge = string | { label: string; variant?: ModelPickerBadgeVariant };

export interface ModelPickerOption {
  value: string;
  label: string;
  description?: string;
  group?: string;
  badges?: ModelPickerBadge[];
  /** A DOM node (cloned for each use) or an image URL. Decorative. */
  icon?: Node | string;
  disabled?: boolean;
}

let pickerCounter = 0;

/**
 * `<kernel-model-picker>` — picks the model a chat is sent to, from a
 * composer's toolbar: a compact pill `<button>` that opens a
 * `role="listbox"` in a `popover="auto"`. See `@kernelui-lib/react`'s
 * `<ModelPicker>` for why this isn't a native `<select>` (options carry
 * descriptions, badges and logos), and which parts the platform still owns
 * (top layer, light dismiss, Escape, focus return) versus the listbox
 * keyboard pattern added by hand (arrows, Home/End, Enter/Space, typeahead,
 * Tab to leave).
 *
 * Options come from the `options` property (structured data, icons as DOM
 * nodes or image URLs), or declaratively from light-DOM `<option>`s read once
 * at connect — optionally inside `<optgroup label="Provider">` — with
 * `data-description` and `data-badges` ("New:accent, Fast"; a bare label is
 * neutral).
 *
 * Attributes: `value`, `name` (submits through a hidden input), `disabled`,
 * `placement` (default top), `align` (default start), `offset` (default 8),
 * and built-in strings `label-model` ("Model") and `label-placeholder`
 * ("Choose a model") — or the `labels` property. Fires `valuechange`
 * (`detail: { value }`) when the reader picks a model.
 */
export class KernelModelPicker extends KernelElement {
  private readonly baseId = `kernel-model-picker-${++pickerCounter}`;
  private readonly positioner = new FloatingPositioner();
  private ownOptions: ModelPickerOption[] = [];
  private trigger: HTMLButtonElement | null = null;
  private list: HTMLElement | null = null;
  private hiddenInput: HTMLInputElement | null = null;
  private active = -1;
  private open = false;
  private typeahead = { buffer: "", timer: undefined as ReturnType<typeof setTimeout> | undefined };

  static get observedAttributes() {
    return ["value", "name", "disabled", "label-model", "label-placeholder"];
  }

  get options(): ModelPickerOption[] {
    return this.ownOptions;
  }

  set options(next: ModelPickerOption[]) {
    this.ownOptions = next ?? [];
    this.renderOptions();
    this.renderTrigger();
  }

  get value(): string {
    return this.getAttribute("value") ?? "";
  }

  set value(next: string) {
    if (next === null || next === undefined || next === "") this.removeAttribute("value");
    else this.setAttribute("value", next);
  }

  connectedCallback() {
    if (this.native) return;

    if (this.ownOptions.length === 0) this.ownOptions = readDeclarativeOptions(this);
    this.replaceChildren();

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.id = this.baseId;
    trigger.className = cls("trigger");
    trigger.setAttribute("popovertarget", `${this.baseId}-list`);
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", `${this.baseId}-list`);
    trigger.setAttribute("data-icon-end", "true");
    trigger.addEventListener("keydown", (event) => this.handleTriggerKeyDown(event));

    const list = document.createElement("div");
    list.id = `${this.baseId}-list`;
    list.className = cls("list");
    list.setAttribute("role", "listbox");
    list.setAttribute("popover", "auto");
    list.tabIndex = -1;
    list.addEventListener("keydown", (event) => this.handleListKeyDown(event));
    list.addEventListener("toggle", (event) => {
      const open = (event as ToggleEvent).newState === "open";
      this.open = open;
      trigger.setAttribute("aria-expanded", String(open));
      this.positioner.setOpen(open);
      if (open) {
        trigger.setAttribute("data-open", "true");
        list.setAttribute("data-open", "true");
        if (this.active === -1) {
          const selected = this.selectedIndex();
          this.active = this.enabled(selected) ? selected : this.firstEnabled();
        }
        this.syncActive();
        requestAnimationFrame(() => list.focus({ preventScroll: true }));
      } else {
        trigger.removeAttribute("data-open");
        list.removeAttribute("data-open");
        this.active = -1;
        this.syncActive();
      }
    });

    const { placement, align, offset } = readFloatingAttributes(this, { placement: "top", align: "start" });
    list.setAttribute("data-placement", placement);
    list.setAttribute("data-align", align);
    this.positioner.attach(trigger, list, { placement, align, offset });

    this.trigger = trigger;
    this.list = list;
    this.native = trigger;
    this.append(trigger, list);
    this.syncAllAttrs();
    this.renderOptions();
    this.renderTrigger();
  }

  disconnectedCallback() {
    clearTimeout(this.typeahead.timer);
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.trigger) return;
    if (name === "disabled") {
      this.trigger.disabled = value !== null;
      return;
    }
    if (name === "name") {
      if (value === null) {
        this.hiddenInput?.remove();
        this.hiddenInput = null;
      } else {
        if (!this.hiddenInput) {
          this.hiddenInput = document.createElement("input");
          this.hiddenInput.type = "hidden";
          this.trigger.after(this.hiddenInput);
        }
        this.hiddenInput.name = value;
        this.hiddenInput.value = this.value;
      }
      return;
    }
    if (name === "value") {
      if (this.hiddenInput) this.hiddenInput.value = value ?? "";
      this.renderTrigger();
      this.syncSelected();
    }
  }

  protected applyLabels() {
    this.list?.setAttribute("aria-label", this.builtInLabel("model", "Model"));
    this.renderTrigger();
  }

  private selectedIndex(): number {
    const value = this.getAttribute("value");
    return value === null ? -1 : this.ownOptions.findIndex((option) => option.value === value);
  }

  private enabled(index: number): boolean {
    return index >= 0 && index < this.ownOptions.length && !this.ownOptions[index]!.disabled;
  }

  private firstEnabled(fromEnd = false): number {
    const order = this.ownOptions.map((_, index) => index);
    if (fromEnd) order.reverse();
    return order.find((index) => this.enabled(index)) ?? -1;
  }

  private step(from: number, direction: 1 | -1): number {
    const count = this.ownOptions.length;
    for (let n = 1; n <= count; n++) {
      const index = (from + direction * n + count * 2) % count;
      if (this.enabled(index)) return index;
    }
    return from;
  }

  private optionId(index: number) {
    return `${this.baseId}-option-${index}`;
  }

  private renderTrigger() {
    const trigger = this.trigger;
    if (!trigger) return;
    const selected = this.ownOptions[this.selectedIndex()];
    trigger.replaceChildren();
    if (selected?.icon) {
      trigger.setAttribute("data-icon-start", "true");
      trigger.append(iconSlot(cls("triggerIcon"), selected.icon));
    } else trigger.removeAttribute("data-icon-start");
    if (selected) trigger.removeAttribute("data-placeholder");
    else trigger.setAttribute("data-placeholder", "true");

    const label = document.createElement("span");
    label.className = cls("triggerLabel");
    const prefix = document.createElement("span");
    prefix.className = "kernel-sr-only";
    prefix.textContent = `${this.builtInLabel("model", "Model")}, `;
    label.append(prefix, document.createTextNode(selected ? selected.label : this.builtInLabel("placeholder", "Choose a model")));
    trigger.append(label);

    const chevronSlot = document.createElement("span");
    chevronSlot.className = cls("triggerIcon");
    chevronSlot.setAttribute("aria-hidden", "true");
    chevronSlot.append(svgIcon(cls("chevron"), "M4.5 6.25 8 9.75l3.5-3.5"));
    trigger.append(chevronSlot);
  }

  private renderOptions() {
    const list = this.list;
    if (!list) return;
    list.replaceChildren();
    const selected = this.selectedIndex();
    let section: HTMLElement | null = null;
    let sectionGroup: string | undefined;
    let sectionIndex = -1;

    this.ownOptions.forEach((option, index) => {
      if (index === 0 || option.group !== sectionGroup) {
        sectionIndex++;
        sectionGroup = option.group;
        if (option.group === undefined) section = null;
        else {
          section = document.createElement("div");
          section.setAttribute("role", "group");
          section.className = cls("group");
          const heading = document.createElement("div");
          heading.id = `${this.baseId}-group-${sectionIndex}`;
          heading.setAttribute("role", "presentation");
          heading.className = cls("groupLabel");
          heading.textContent = option.group;
          section.setAttribute("aria-labelledby", heading.id);
          section.append(heading);
          list.append(section);
        }
      }

      const row = document.createElement("div");
      row.id = this.optionId(index);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(index === selected));
      row.className = cls("option");
      if (option.disabled) {
        row.setAttribute("aria-disabled", "true");
        row.setAttribute("data-disabled", "true");
      }
      row.addEventListener("pointermove", () => {
        if (this.enabled(index) && this.active !== index) {
          this.active = index;
          this.syncActive();
        }
      });
      row.addEventListener("click", () => this.choose(index));

      if (option.icon) row.append(iconSlot(cls("optionIcon"), option.icon));

      const text = document.createElement("span");
      text.className = cls("optionText");
      const title = document.createElement("span");
      title.className = cls("optionTitle");
      const name = document.createElement("span");
      name.className = cls("optionLabel");
      name.textContent = option.label;
      title.append(name);
      for (const badge of option.badges ?? []) {
        const { label, variant } = typeof badge === "string" ? { label: badge, variant: undefined } : badge;
        const chip = document.createElement("span");
        chip.className = kernelClass("Badge");
        chip.dataset.variant = variant && BADGE_VARIANTS.has(variant) ? variant : "neutral";
        chip.textContent = label;
        title.append(chip);
      }
      text.append(title);
      if (option.description) {
        const description = document.createElement("span");
        description.className = cls("optionDescription");
        description.textContent = option.description;
        text.append(description);
      }
      row.append(text);
      const check = svgIcon(cls("check"), "M3.5 8.5 6.5 11.5 12.5 5");
      check.setAttribute("aria-hidden", "true");
      row.append(check);

      (section ?? list).append(row);
    });
    this.syncActive();
  }

  private syncSelected() {
    const selected = this.selectedIndex();
    this.list?.querySelectorAll<HTMLElement>('[role="option"]').forEach((row, index) => {
      row.setAttribute("aria-selected", String(index === selected));
    });
  }

  private syncActive() {
    const list = this.list;
    if (!list) return;
    list.querySelectorAll<HTMLElement>('[role="option"]').forEach((row, index) => {
      if (index === this.active) row.setAttribute("data-active", "true");
      else row.removeAttribute("data-active");
    });
    if (this.open && this.active !== -1) {
      list.setAttribute("aria-activedescendant", this.optionId(this.active));
      list.querySelector(`#${CSS.escape(this.optionId(this.active))}`)?.scrollIntoView({ block: "nearest" });
    } else list.removeAttribute("aria-activedescendant");
  }

  private show(initial?: number) {
    if (this.hasAttribute("disabled")) return;
    if (initial !== undefined) this.active = initial;
    try {
      this.list?.showPopover();
    } catch {
      /* already open */
    }
  }

  private close() {
    try {
      this.list?.hidePopover();
    } catch {
      /* already closed */
    }
  }

  private choose(index: number) {
    if (!this.enabled(index)) return;
    const value = this.ownOptions[index]!.value;
    this.value = value;
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value }, bubbles: true }));
    this.close();
    this.trigger?.focus();
  }

  /** Same typeahead as React's: one repeated letter cycles, a typed prefix
   * within half a second narrows. */
  private match(key: string, from: number): number {
    const state = this.typeahead;
    clearTimeout(state.timer);
    state.buffer += key.toLowerCase();
    state.timer = setTimeout(() => {
      state.buffer = "";
    }, TYPEAHEAD_RESET_MS);
    const repeated = state.buffer.split("").every((char) => char === state.buffer[0]);
    const query = repeated ? state.buffer[0]! : state.buffer;
    const startOffset = repeated || state.buffer.length === 1 ? 1 : 0;
    const count = this.ownOptions.length;
    for (let n = 0; n < count; n++) {
      const index = (from + startOffset + n + count) % count;
      if (this.enabled(index) && this.ownOptions[index]!.label.toLowerCase().startsWith(query)) return index;
    }
    return -1;
  }

  private isTypeaheadKey(event: KeyboardEvent) {
    return event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  private handleTriggerKeyDown(event: KeyboardEvent) {
    if (this.hasAttribute("disabled")) return;
    const selected = this.selectedIndex();
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      this.show(this.enabled(selected) ? selected : this.firstEnabled(event.key === "ArrowUp"));
    } else if (this.isTypeaheadKey(event)) {
      const found = this.match(event.key, selected);
      if (found !== -1) {
        event.preventDefault();
        this.show(found);
      }
    }
  }

  private handleListKeyDown(event: KeyboardEvent) {
    const move = (index: number) => {
      event.preventDefault();
      this.active = index;
      this.syncActive();
    };
    switch (event.key) {
      case "ArrowDown":
        move(this.active === -1 ? this.firstEnabled() : this.step(this.active, 1));
        return;
      case "ArrowUp":
        move(this.active === -1 ? this.firstEnabled(true) : this.step(this.active, -1));
        return;
      case "Home":
        move(this.firstEnabled());
        return;
      case "End":
        move(this.firstEnabled(true));
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        this.choose(this.active);
        return;
      case "Tab":
        this.close();
        return;
      default:
        if (this.isTypeaheadKey(event)) {
          const found = this.match(event.key, this.active);
          if (found !== -1) move(found);
        }
    }
  }
}

function svgIcon(className: string, d: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("class", className);
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", d);
  path.setAttribute("stroke", "currentColor");
  path.setAttribute("stroke-width", "1.5");
  path.setAttribute("stroke-linecap", "round");
  path.setAttribute("stroke-linejoin", "round");
  svg.append(path);
  return svg;
}

function iconSlot(className: string, icon: Node | string): HTMLElement {
  const slot = document.createElement("span");
  slot.className = className;
  slot.setAttribute("aria-hidden", "true");
  if (typeof icon === "string") {
    const img = document.createElement("img");
    img.src = icon;
    img.alt = "";
    img.width = 16;
    img.height = 16;
    slot.append(img);
  } else slot.append(icon.cloneNode(true));
  return slot;
}

function parseBadges(raw: string | null): ModelPickerBadge[] | undefined {
  if (!raw) return undefined;
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [label, variant] = part.split(":").map((s) => s.trim());
      return variant && BADGE_VARIANTS.has(variant)
        ? { label: label!, variant: variant as ModelPickerBadgeVariant }
        : label!;
    });
}

function readDeclarativeOptions(host: HTMLElement): ModelPickerOption[] {
  return Array.from(host.querySelectorAll("option")).map((option) => {
    const group = option.parentElement instanceof HTMLOptGroupElement ? option.parentElement.label : undefined;
    return {
      value: option.value,
      label: (option.textContent ?? "").trim(),
      description: option.dataset.description || undefined,
      group: group || undefined,
      badges: parseBadges(option.getAttribute("data-badges")),
      disabled: option.disabled || undefined,
    };
  });
}

customElements.define("kernel-model-picker", KernelModelPicker);
