import { KernelElement, kernelClass } from "../../base";
import "./EmptyState.css";

let nextId = 0;

/**
 * `<kernel-empty-state>` — a zero-data placeholder on a real `<section>`
 * labelled by its own real heading (`aria-labelledby`), so a screen-reader
 * user navigating by heading or landmark lands on it and hears what's
 * missing. Mirrors `@kernelui-lib/react`'s `<EmptyState>`.
 *
 * Attributes: `heading` (the heading text; not `title`, which every
 * element already has as its native hover tooltip), `heading-level`
 * (1–6, default 3), `description`, `variant` (`dashed` | `plain`, default
 * `dashed`).
 *
 * Slots: a child with `slot="icon"` becomes the decorative icon
 * (`aria-hidden`); `slot="heading"` and `slot="description"` replace the
 * attributes with rich content; `slot="actions"` holds the next-step
 * buttons. Any other children sit between the description and actions.
 */
export class KernelEmptyState extends KernelElement {
  private heading: HTMLElement | null = null;
  private description: HTMLParagraphElement | null = null;
  private headingSlot: Element | null = null;
  private readonly baseId = `kernel-empty-state-${++nextId}`;

  static get observedAttributes() {
    return ["heading", "heading-level", "description", "variant"];
  }

  connectedCallback() {
    if (this.native) return;
    const take = (slot: string) => {
      const el = this.querySelector(`:scope > [slot="${slot}"]`);
      el?.removeAttribute("slot");
      el?.remove();
      return el;
    };
    const iconSlot = take("icon");
    this.headingSlot = take("heading");
    const descriptionSlot = take("description");
    const actionsSlot = take("actions");

    const section = document.createElement("section");
    section.className = kernelClass("EmptyState");
    section.setAttribute("data-slot", "empty-state");
    section.setAttribute("aria-labelledby", `${this.baseId}-title`);

    if (iconSlot) {
      const icon = document.createElement("div");
      icon.className = kernelClass("EmptyState", "icon");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("data-slot", "empty-state-icon");
      icon.append(iconSlot);
      section.append(icon);
    }

    const description = document.createElement("p");
    description.id = `${this.baseId}-description`;
    description.className = kernelClass("EmptyState", "description");
    description.setAttribute("data-slot", "empty-state-description");
    if (descriptionSlot) description.append(descriptionSlot);
    this.description = description;

    const body = Array.from(this.childNodes);
    this.native = section;
    this.renderHeading();
    section.append(description, ...body);

    if (actionsSlot) {
      const actions = document.createElement("div");
      actions.className = kernelClass("EmptyState", "actions");
      actions.setAttribute("data-slot", "empty-state-actions");
      actions.append(actionsSlot);
      section.append(actions);
    }

    this.append(section);
    this.syncAllAttrs();
  }

  private renderHeading() {
    const section = this.native;
    if (!section) return;
    const raw = Number(this.getAttribute("heading-level") ?? 3);
    const level = Number.isInteger(raw) && raw >= 1 && raw <= 6 ? raw : 3;
    const heading = document.createElement(`h${level}`);
    heading.id = `${this.baseId}-title`;
    heading.className = kernelClass("EmptyState", "title");
    heading.setAttribute("data-slot", "empty-state-title");
    if (this.headingSlot) heading.append(this.headingSlot);
    else heading.textContent = this.getAttribute("heading") ?? "";
    if (this.heading) this.heading.replaceWith(heading);
    else {
      const icon = section.querySelector(`.${kernelClass("EmptyState", "icon")}`);
      if (icon) icon.after(heading);
      else section.prepend(heading);
    }
    this.heading = heading;
  }

  protected syncAttr(name: string, value: string | null) {
    const section = this.native;
    if (!section) return;
    switch (name) {
      case "heading":
        if (!this.headingSlot && this.heading) this.heading.textContent = value ?? "";
        break;
      case "heading-level":
        if (this.heading && this.heading.tagName !== `H${value ?? 3}`) this.renderHeading();
        break;
      case "description": {
        const description = this.description;
        if (!description) break;
        if (value !== null && description.childElementCount === 0) description.textContent = value;
        const hasDescription = (description.textContent ?? "").trim() !== "";
        description.hidden = !hasDescription;
        if (hasDescription) section.setAttribute("aria-describedby", description.id);
        else section.removeAttribute("aria-describedby");
        break;
      }
      case "variant":
        section.dataset.variant = value === "plain" ? "plain" : "dashed";
        break;
    }
  }
}

customElements.define("kernel-empty-state", KernelEmptyState);
