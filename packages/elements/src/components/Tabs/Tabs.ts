import { KernelElement, kernelClass } from "../../base";
import "./Tabs.css";

let tabsCounter = 0;

/**
 * `<kernel-tabs>` — the WAI-ARIA `tablist` pattern (there's no native
 * tabs element). Wraps a `<kernel-tabs-list>` (containing
 * `<kernel-tab>` triggers) and one `<kernel-tab-panel>` per tab, as
 * flat light-DOM children — same shape as `@kernelui/react`'s
 * `<Tabs><TabsList>...</TabsList><TabPanel/>...</Tabs>`.
 *
 * Attributes: `value` (controlled — set it to change tabs
 * externally), `default-value` (required if `value` is never set).
 * Fires a `valuechange` `CustomEvent` (`event.detail.value`) when the
 * active tab changes.
 */
export class KernelTabs extends KernelElement {
  private readonly baseId = `kernel-tabs-${++tabsCounter}`;
  private currentValue = "";
  private previousIndicatorX: number | null = null;

  static get observedAttributes() {
    return ["value"];
  }

  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = kernelClass("Tabs", "root");
    return element;
  }

  connectedCallback() {
    super.connectedCallback();
    this.currentValue = this.getAttribute("value") ?? this.getAttribute("default-value") ?? "";
    // Deferred to a microtask: when the whole subtree upgrades in one
    // batch (the common case — a page's custom elements all define()
    // after the static HTML has already parsed), the browser upgrades
    // in document order, parent before children. Rendering synchronously
    // here would run before <kernel-tabs-list>/<kernel-tab> have built
    // their own native <button>s, so this queries an empty tree. A
    // microtask runs after the whole synchronous upgrade batch finishes.
    queueMicrotask(() => this.render());
  }

  get tabs(): HTMLElement[] {
    return Array.from(this.querySelectorAll("kernel-tab"));
  }

  get panels(): HTMLElement[] {
    return Array.from(this.querySelectorAll("kernel-tab-panel"));
  }

  setValue(value: string) {
    if (this.currentValue === value) return;
    this.currentValue = value;
    if (!this.hasAttribute("value")) {
      this.render();
    } else {
      this.setAttribute("value", value);
    }
    this.dispatchEvent(new CustomEvent("valuechange", { detail: { value }, bubbles: true }));
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "value" || value === null) return;
    this.currentValue = value;
    this.render();
  }

  render() {
    const value = this.currentValue;
    let selectedButton: HTMLButtonElement | null = null;

    for (const tab of this.tabs) {
      const tabValue = tab.getAttribute("value") ?? "";
      const selected = tabValue === value;
      const button = tab.querySelector("button");
      if (button) {
        button.id = `${this.baseId}-tab-${tabValue}`;
        button.setAttribute("aria-selected", String(selected));
        button.setAttribute("aria-controls", `${this.baseId}-panel-${tabValue}`);
        button.tabIndex = selected ? 0 : -1;
        if (selected) selectedButton = button;
      }
    }

    for (const panel of this.panels) {
      const panelValue = panel.getAttribute("value") ?? "";
      const div = panel.querySelector(`.${kernelClass("Tabs", "panel")}`) as HTMLElement | null;
      if (!div) continue;
      const selected = panelValue === value;
      div.id = `${this.baseId}-panel-${panelValue}`;
      div.setAttribute("aria-labelledby", `${this.baseId}-tab-${panelValue}`);
      div.hidden = !selected;
    }

    const list = this.querySelector("kernel-tabs-list") as KernelTabsList | null;
    if (list) {
      this.previousIndicatorX = list.updateIndicator(selectedButton, this.previousIndicatorX);
    }
  }
}

/** `<kernel-tabs-list>` — `role="tablist"`. Attributes: `aria-label`
 * (required). Handles arrow-key/Home/End roving between `<kernel-tab>`
 * children and the animated sliding indicator. */
export class KernelTabsList extends KernelElement {
  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.setAttribute("role", "tablist");
    element.className = kernelClass("Tabs", "list");
    element.addEventListener("keydown", (event) => this.handleKeyDown(event));
    return element;
  }

  connectedCallback() {
    if (this.native) return;
    const native = this.createNative();
    const indicator = document.createElement("span");
    indicator.className = kernelClass("Tabs", "indicator");
    native.append(indicator);
    this.moveChildrenInto(native);
    this.native = native;
    this.append(native);
    this.syncAllAttrs();
  }

  static get observedAttributes() {
    return ["aria-label"];
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "aria-label" || !this.native) return;
    if (value === null) this.native.removeAttribute("aria-label");
    else this.native.setAttribute("aria-label", value);
  }

  private handleKeyDown(event: KeyboardEvent) {
    const tabsHost = this.closest("kernel-tabs") as KernelTabs | null;
    if (!tabsHost) return;
    const buttons = tabsHost.tabs
      .map((t) => t.querySelector("button"))
      .filter((b): b is HTMLButtonElement => !!b && !b.disabled);
    if (!buttons.length) return;

    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % buttons.length;
        break;
      case "ArrowLeft":
        nextIndex = currentIndex === -1 ? buttons.length - 1 : (currentIndex - 1 + buttons.length) % buttons.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = buttons.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    const next = buttons[nextIndex];
    next?.focus();
    next?.click();
  }

  updateIndicator(activeButton: HTMLButtonElement | null, previousX: number | null): number | null {
    const indicator = this.native?.querySelector<HTMLElement>(`.${kernelClass("Tabs", "indicator")}`);
    if (!indicator || !activeButton) return previousX;

    const nextX = activeButton.offsetLeft;
    const nextWidth = activeButton.offsetWidth;
    const isFirstRender = previousX === null;
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let duration = 0;
    if (!isFirstRender && !reducedMotion) {
      const distance = Math.abs(nextX - previousX);
      duration = Math.min(560, Math.max(220, distance * 1.1));
    }

    indicator.style.transitionDuration = `${duration}ms`;
    indicator.style.setProperty("--kernel-tabs-indicator-x", `${nextX}px`);
    indicator.style.setProperty("--kernel-tabs-indicator-width", `${nextWidth}px`);

    return nextX;
  }
}

/** `<kernel-tab>` — a real `<button role="tab">`. Attributes: `value`
 * (required), `disabled`. */
export class KernelTab extends KernelElement {
  static get observedAttributes() {
    return ["value", "disabled"];
  }

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "tab");
    button.className = kernelClass("Tabs", "tab");
    button.addEventListener("click", () => {
      const tabsHost = this.closest("kernel-tabs") as KernelTabs | null;
      const value = this.getAttribute("value");
      if (tabsHost && value !== null) tabsHost.setValue(value);
    });
    return button;
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    if (name === "disabled") button.disabled = value !== null;
  }
}

/** `<kernel-tab-panel>` — a real `role="tabpanel"`, hidden via the
 * native `hidden` attribute when inactive (genuinely removed from
 * layout and the accessibility tree). Attributes: `value` (required). */
export class KernelTabPanel extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("role", "tabpanel");
    div.tabIndex = 0;
    div.className = kernelClass("Tabs", "panel");
    return div;
  }
}

customElements.define("kernel-tabs", KernelTabs);
customElements.define("kernel-tabs-list", KernelTabsList);
customElements.define("kernel-tab", KernelTab);
customElements.define("kernel-tab-panel", KernelTabPanel);
