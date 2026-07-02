import { KernelElement, kernelClass } from "../../base";
import "./Dialog.css";

let dialogCounter = 0;

/**
 * `<kernel-dialog>` — a real `<dialog>`, opened with `showModal()`.
 * That single call gets a native top-layer stacking context, a native
 * focus trap, native Escape-to-close, and a native `::backdrop`, none
 * of it reimplemented here.
 *
 * Attributes: `open` (toggle to show/hide — set it, don't call
 * `showModal()` yourself), `title` (required — or use a child tagged
 * `slot="title"` for richer markup), `description`,
 * `close-on-backdrop-click` (default true — set to `"false"` to
 * require an explicit close).
 *
 * Events: a `close` event fires (bubbling, matching the native
 * `<dialog>` event name) whenever the dialog closes via any path —
 * Escape, backdrop click, or the close button — with the `open`
 * attribute already removed by the time it fires.
 */
export class KernelDialog extends KernelElement {
  private readonly titleId = `kernel-dialog-title-${++dialogCounter}`;
  private readonly descriptionId = `kernel-dialog-description-${dialogCounter}`;

  static get observedAttributes() {
    return ["open", "title", "description"];
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

    const dialog = document.createElement("dialog");
    dialog.className = kernelClass("Dialog", "content");
    dialog.setAttribute("aria-labelledby", this.titleId);
    dialog.setAttribute("closedby", "any");

    const header = document.createElement("header");
    header.className = kernelClass("Dialog", "header");

    const heading = document.createElement("h2");
    heading.className = kernelClass("Dialog", "title");
    heading.id = this.titleId;
    if (titleSlot) heading.append(titleSlot);
    else heading.textContent = this.getAttribute("title") ?? "";

    const closeButton = document.createElement("button");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "Close");
    closeButton.className = `${kernelClass("Button")} ${kernelClass("Dialog", "closeButton")}`;
    closeButton.dataset.variant = "ghost";
    closeButton.dataset.size = "sm";
    closeButton.innerHTML =
      '<span class="' +
      kernelClass("Button", "label") +
      '"><svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">' +
      '<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg></span>';
    closeButton.addEventListener("click", () => this.removeAttribute("open"));

    header.append(heading, closeButton);

    const description = document.createElement("p");
    description.className = kernelClass("Dialog", "description");
    description.id = this.descriptionId;

    const body = document.createElement("div");
    body.className = kernelClass("Dialog", "body");
    body.append(...rest);

    dialog.append(header, description, body);

    dialog.addEventListener("click", (event) => {
      if (this.getAttribute("close-on-backdrop-click") === "false") return;
      if (event.target === dialog) this.removeAttribute("open");
    });
    dialog.addEventListener("close", () => {
      this.removeAttribute("open");
      this.dispatchEvent(new Event("close", { bubbles: true }));
    });
    dialog.addEventListener("cancel", (event) => event.stopPropagation());

    this.native = dialog;
    this.append(dialog);
    this.syncAllAttrs();
  }

  protected syncAttr(name: string, value: string | null) {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;

    switch (name) {
      case "open":
        if (value !== null && !dialog.open) dialog.showModal();
        if (value === null && dialog.open) dialog.close();
        break;
      case "title": {
        const heading = dialog.querySelector(`.${kernelClass("Dialog", "title")}`);
        if (heading && !heading.querySelector("*")) heading.textContent = value ?? "";
        break;
      }
      case "description": {
        const description = dialog.querySelector(`.${kernelClass("Dialog", "description")}`) as HTMLElement | null;
        if (!description) break;
        description.textContent = value ?? "";
        description.hidden = !value;
        dialog.setAttribute("aria-describedby", value ? this.descriptionId : "");
        if (!value) dialog.removeAttribute("aria-describedby");
        break;
      }
    }
  }
}

customElements.define("kernel-dialog", KernelDialog);
