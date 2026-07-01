import { KernelElement, kernelClass } from "../../base";
import "./Pagination.css";

/**
 * `<kernel-pagination>` — a real `<nav aria-label="Pagination">`
 * wrapping a real `<ol>` of page links; an ordered trail of pages is
 * exactly what an ordered list is for. Compose with
 * `<kernel-pagination-item>`, `<kernel-pagination-previous>`,
 * `<kernel-pagination-next>`, and `<kernel-pagination-ellipsis>`.
 */
export class KernelPagination extends KernelElement {
  connectedCallback() {
    if (this.native) return;
    const nav = document.createElement("nav");
    nav.className = kernelClass("Pagination");
    nav.setAttribute("aria-label", "Pagination");
    const list = document.createElement("ol");
    list.className = kernelClass("Pagination", "list");
    this.moveChildrenInto(list);
    nav.append(list);
    this.native = nav;
    this.append(nav);
  }
}

/** `<kernel-pagination-item>` — a real `<a>` page link. Attributes:
 * `href`, `current` (boolean, sets `aria-current="page"`). */
export class KernelPaginationItem extends KernelElement {
  static get observedAttributes() {
    return ["href", "current"];
  }

  connectedCallback() {
    if (this.native) return;
    const li = document.createElement("li");
    const link = document.createElement("a");
    link.className = kernelClass("Pagination", "item");
    this.moveChildrenInto(link);
    li.append(link);
    this.native = li;
    this.append(li);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const link = this.native?.querySelector("a");
    if (!link) return;
    if (name === "href") {
      if (value === null) link.removeAttribute("href");
      else link.setAttribute("href", value);
    } else if (name === "current") {
      if (value === null) link.removeAttribute("aria-current");
      else link.setAttribute("aria-current", "page");
    }
  }
}

/** Shared button behaviour for Previous/Next. */
abstract class KernelPaginationControl extends KernelElement {
  static get observedAttributes() {
    return ["disabled"];
  }

  protected abstract defaultLabel(): string;
  /** Named to avoid colliding with the native, public
   * `HTMLElement.ariaLabel` ARIA-reflection property. */
  protected abstract controlAriaLabel(): string;

  private labelNodes: ChildNode[] = [];

  connectedCallback() {
    if (this.native) return;
    const fragment = document.createDocumentFragment();
    this.moveChildrenInto(fragment);
    this.labelNodes = Array.from(fragment.childNodes);

    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = kernelClass("Pagination", "control");
    button.setAttribute("aria-label", this.controlAriaLabel());
    if (this.labelNodes.length) button.append(...this.labelNodes);
    else button.textContent = this.defaultLabel();
    li.append(button);
    this.native = li;
    this.append(li);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native?.querySelector("button");
    if (!button) return;
    if (name === "disabled") (button as HTMLButtonElement).disabled = value !== null;
  }
}

/** `<kernel-pagination-previous>` — a real `<button>`, not a link:
 * "previous page" changes state on the same view. */
export class KernelPaginationPrevious extends KernelPaginationControl {
  protected defaultLabel() {
    return "‹ Previous";
  }
  protected controlAriaLabel() {
    return "Go to previous page";
  }
}

/** `<kernel-pagination-next>` — see `KernelPaginationPrevious`. */
export class KernelPaginationNext extends KernelPaginationControl {
  protected defaultLabel() {
    return "Next ›";
  }
  protected controlAriaLabel() {
    return "Go to next page";
  }
}

/** `<kernel-pagination-ellipsis>` — decorative, hidden from assistive
 * tech (the surrounding page links already convey the gap). */
export class KernelPaginationEllipsis extends KernelElement {
  connectedCallback() {
    if (this.native) return;
    const li = document.createElement("li");
    li.className = kernelClass("Pagination", "ellipsis");
    li.setAttribute("aria-hidden", "true");
    li.textContent = "…";
    this.native = li;
    this.append(li);
  }
}

customElements.define("kernel-pagination", KernelPagination);
customElements.define("kernel-pagination-item", KernelPaginationItem);
customElements.define("kernel-pagination-previous", KernelPaginationPrevious);
customElements.define("kernel-pagination-next", KernelPaginationNext);
customElements.define("kernel-pagination-ellipsis", KernelPaginationEllipsis);
