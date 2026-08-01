import { KernelElement, kernelClass } from "../../base";
import "./Suggestion.css";

/**
 * `<kernel-suggestion>` — a horizontal row of prompt suggestions
 * (`<kernel-suggestion-item>` children). A real `<ul role="list">`, not a
 * div of clickable spans.
 *
 * Attributes: `label` (accessible name, default "Suggestions"),
 * `disabled`.
 */
export class KernelSuggestion extends KernelElement {
  static get observedAttributes() {
    return ["label", "disabled"];
  }

  protected createNative(): HTMLElement {
    const list = document.createElement("ul");
    list.setAttribute("role", "list");
    list.className = kernelClass("Suggestion");
    list.setAttribute("aria-label", "Suggestions");
    return list;
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "label") {
      this.native.setAttribute("aria-label", value || "Suggestions");
    } else if (name === "disabled") {
      if (value !== null) this.native.setAttribute("data-disabled", "");
      else this.native.removeAttribute("data-disabled");
      for (const item of this.querySelectorAll("kernel-suggestion-item")) {
        if (value !== null) item.setAttribute("disabled", "");
        else item.removeAttribute("disabled");
      }
    }
  }
}

/**
 * `<kernel-suggestion-item>` — one suggestion chip. Owns a real
 * `<li>` > `<button type="button">`. The host uses `display: contents`
 * so the `<li>` participates as a direct child of the parent `<ul>`
 * (custom elements can't be `<li>` themselves).
 *
 * Attributes: `value` (detail of the `select` CustomEvent; defaults to
 * the button text), `disabled`.
 *
 * Events: `select` CustomEvent with `detail.value`.
 */
export class KernelSuggestionItem extends KernelElement {
  static get observedAttributes() {
    return ["value", "disabled"];
  }

  connectedCallback() {
    this.style.display = "contents";
    super.connectedCallback();
  }

  protected createNative(): HTMLElement {
    const item = document.createElement("li");
    item.className = kernelClass("Suggestion", "item");

    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Suggestion", "button");
    button.addEventListener("click", () => {
      if (this.hasAttribute("disabled")) return;
      const value = this.getAttribute("value") ?? button.textContent ?? "";
      this.dispatchEvent(
        new CustomEvent("select", { detail: { value }, bubbles: true }),
      );
    });

    item.append(button);
    return item;
  }

  protected moveChildrenInto(target: Node) {
    const button = (target as HTMLElement).querySelector("button");
    if (!button) return;
    while (this.firstChild) button.appendChild(this.firstChild);
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native?.querySelector("button");
    if (!button) return;
    if (name === "disabled") {
      button.disabled = value !== null;
    }
  }
}

customElements.define("kernel-suggestion", KernelSuggestion);
customElements.define("kernel-suggestion-item", KernelSuggestionItem);
