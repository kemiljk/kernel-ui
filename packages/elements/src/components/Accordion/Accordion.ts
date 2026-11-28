import { KernelElement, kernelClass } from "../../base";
import { inputModality } from "../../utils/changeDetails";
import { DetailsPanelAnimator } from "../../utils/detailsTransition";
import "./Accordion.css";

let accordionCounter = 0;

/**
 * `<kernel-accordion>` — groups `<kernel-accordion-item>` children.
 * Attributes: `type` (`single` default | `multiple`). `single` gives
 * every item the same generated `name`, so the browser enforces
 * "only one open at a time" natively — no JS coordination needed.
 */
export class KernelAccordion extends KernelElement {
  private readonly generatedName = `kernel-accordion-${++accordionCounter}`;

  protected createNative(): HTMLElement {
    const element = document.createElement("div");
    element.className = kernelClass("Accordion", "accordion");
    return element;
  }

  get resolvedName(): string | undefined {
    return this.getAttribute("type") === "multiple" ? undefined : this.generatedName;
  }
}

/**
 * `<kernel-accordion-item>` — a real `<details>`/`<summary>`; expand/
 * collapse, keyboard support, find-in-page, and print all come from the
 * browser. The open/close transition uses measured-height WAAPI on the
 * content panel (see `DetailsPanelAnimator`).
 *
 * Attributes: `title` (the summary text — for richer markup, use a
 * child tagged `slot="title"` instead), `default-open` (boolean, read
 * once at connect).
 *
 * Events: a bubbling, cancelable `beforetoggle` `CustomEvent` before the
 * summary opens or closes the item, `detail: { open, reason }` with
 * `reason` `"trigger-press"` or `"keyboard"`; `preventDefault()` keeps it
 * as it is. (An item the browser closes because another in the same
 * single-open accordion opened isn't reported.)
 */
export class KernelAccordionItem extends KernelElement {
  private animator: DetailsPanelAnimator | undefined;

  static get observedAttributes() {
    return ["title"];
  }

  connectedCallback() {
    if (this.native) return;

    const titleSlot = this.querySelector('[slot="title"]');
    const rest: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node !== titleSlot) rest.push(node);
    }
    for (const node of rest) node.parentNode?.removeChild(node);
    if (titleSlot) titleSlot.parentNode?.removeChild(titleSlot);

    const details = document.createElement("details");
    details.className = kernelClass("Accordion", "item");

    const group = this.closest("kernel-accordion") as KernelAccordion | null;
    const name = group?.resolvedName;
    if (name) details.setAttribute("name", name);

    const summary = document.createElement("summary");
    summary.className = kernelClass("Accordion", "trigger");

    // Unclassed, like React's: no stylesheet rule targets the title, and
    // a class only one package emits would be a parity trap.
    const titleSpan = document.createElement("span");
    if (titleSlot) titleSpan.append(titleSlot);
    else titleSpan.textContent = this.getAttribute("title") ?? "";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 16 16");
    chevron.setAttribute("width", "16");
    chevron.setAttribute("height", "16");
    chevron.setAttribute("fill", "none");
    chevron.setAttribute("aria-hidden", "true");
    chevron.setAttribute("class", kernelClass("Accordion", "chevron"));
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("d", "M4 6L8 10L12 6");
    path.setAttribute("stroke", "currentColor");
    path.setAttribute("stroke-width", "1.75");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    chevron.append(path);

    summary.append(titleSpan, chevron);

    const content = document.createElement("div");
    content.className = kernelClass("Accordion", "content");
    content.append(...rest);

    details.append(summary, content);
    this.animator = new DetailsPanelAnimator(details, content, {
      onBeforeOpenChange: (open, event) =>
        this.emitChange(
          "beforetoggle",
          { open },
          inputModality(event) === "keyboard" ? "keyboard" : "trigger-press",
          event,
        ),
    });
    if (this.hasAttribute("default-open")) this.animator.snapOpen(true);

    this.native = details;
    this.append(details);
  }

  disconnectedCallback() {
    this.animator?.destroy();
    this.animator = undefined;
  }

  protected syncAttr(name: string, value: string | null) {
    if (name !== "title" || !this.native) return;
    const titleSpan = this.native.querySelector(":scope > summary > span:first-child");
    if (titleSpan && !titleSpan.querySelector("*")) titleSpan.textContent = value ?? "";
  }
}

customElements.define("kernel-accordion", KernelAccordion);
customElements.define("kernel-accordion-item", KernelAccordionItem);
