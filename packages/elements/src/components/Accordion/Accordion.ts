import { KernelElement, kernelClass } from "../../base";
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

    const titleSpan = document.createElement("span");
    titleSpan.className = kernelClass("Accordion", "title");
    if (titleSlot) titleSpan.append(titleSlot);
    else titleSpan.textContent = this.getAttribute("title") ?? "";

    const chevron = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    chevron.setAttribute("viewBox", "0 0 16 16");
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
    this.animator = new DetailsPanelAnimator(details, content);
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
    const titleSpan = this.native.querySelector(`.${kernelClass("Accordion", "title")}`);
    if (titleSpan && !titleSpan.querySelector("*")) titleSpan.textContent = value ?? "";
  }
}

customElements.define("kernel-accordion", KernelAccordion);
customElements.define("kernel-accordion-item", KernelAccordionItem);
