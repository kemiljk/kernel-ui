import { KernelElement, kernelClass } from "../../base";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import "./Dialog.css";

let dialogCounter = 0;

/**
 * `<kernel-dialog>` — a real `<dialog>`, opened with `showModal()`.
 * That single call gets a native top-layer stacking context, a native
 * focus trap, native Escape-to-close, and a native `::backdrop`, none
 * of it reimplemented here. Closing is delayed until exit transitions
 * finish so consumer animations can run; focus restores when the final
 * native `close()` fires.
 *
 * Attributes: `open` (toggle to show/hide — set it, don't call
 * `showModal()` yourself), `title` (required — or use a child tagged
 * `slot="title"` for richer markup), `description`,
 * `close-on-backdrop-click` (default true — set to `"false"` to
 * require an explicit close), `show-close-button` (default true — set
 * to `"false"` to omit), `backdrop` (default/blur/opaque/transparent),
 * `side` (center/left/right/top/bottom, default center — a side turns
 * the dialog into an edge-anchored sheet that slides in by translate
 * instead of the default scale settle, for drawers like a mobile nav).
 *
 * Built-in strings: `label-close` (default "Close"), or the `labels`
 * property (`{ close }`) — see `DialogLabels` in `@kernelui-lib/react`.
 *
 * Part classes (stable `data-slot` hooks too): dialog, header, title,
 * description, content, close.
 *
 * Events: a `close` event fires (bubbling, matching the native
 * `<dialog>` event name) whenever the dialog finishes closing via any
 * path — Escape, backdrop click, or the close button — with the `open`
 * attribute already removed by the time it fires, and `detail.reason`
 * saying which path it was.
 *
 * Before closing for one of those reasons, a bubbling, cancelable
 * `cancel` event fires (the native `<dialog>`'s own name for "about to
 * close"), with `detail.reason`: `"close-button"`, `"escape-key"`,
 * `"outside-press"`, or `"programmatic"` (the native dialog closed some
 * other way, such as a `method="dialog"` form). `preventDefault()` keeps
 * the dialog open. Removing the `open` attribute yourself closes it
 * without asking.
 */
export class KernelDialog extends KernelElement {
  private readonly titleId = `kernel-dialog-title-${++dialogCounter}`;
  private readonly descriptionId = `kernel-dialog-description-${dialogCounter}`;
  private closing = false;
  private exitAbort: AbortController | null = null;
  private skipCloseEvent = false;
  private closeReason = "programmatic";

  static get observedAttributes() {
    return ["open", "title", "description", "backdrop", "show-close-button", "side", "label-close"];
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
    dialog.setAttribute("data-slot", "dialog");

    const header = document.createElement("header");
    header.className = kernelClass("Dialog", "header");
    header.setAttribute("data-slot", "dialog-header");

    const heading = document.createElement("h2");
    heading.className = kernelClass("Dialog", "title");
    heading.id = this.titleId;
    heading.setAttribute("data-slot", "dialog-title");
    if (titleSlot) heading.append(titleSlot);
    else heading.textContent = this.getAttribute("title") ?? "";

    header.append(heading);

    if (this.getAttribute("show-close-button") !== "false") {
      const closeButton = document.createElement("button");
      closeButton.type = "button";
      closeButton.setAttribute("data-slot", "dialog-close");
      closeButton.className = `${kernelClass("Button")} ${kernelClass("Dialog", "closeButton")}`;
      closeButton.dataset.variant = "ghost";
      closeButton.dataset.size = "sm";
      // Same shape React's <Button> renders for a lone icon: an icon slot,
      // flagged at both edges, so the button is a concentric square.
      closeButton.dataset.iconStart = "true";
      closeButton.dataset.iconEnd = "true";
      closeButton.innerHTML =
        `<span class="${kernelClass("Button", "icon")}" aria-hidden="true">` +
        '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">' +
        '<path d="M4 4L12 12M12 4L4 12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" /></svg></span>';
      closeButton.addEventListener("click", (event) => this.requestClose("close-button", event));
      header.append(closeButton);
    }

    const description = document.createElement("p");
    description.className = kernelClass("Dialog", "description");
    description.id = this.descriptionId;
    description.setAttribute("data-slot", "dialog-description");

    const body = document.createElement("div");
    body.className = kernelClass("Dialog", "body");
    body.setAttribute("data-slot", "dialog-content");
    body.append(...rest);

    dialog.append(header, description, body);

    dialog.addEventListener("click", (event) => {
      if (this.getAttribute("close-on-backdrop-click") === "false") return;
      if (event.target === dialog) this.requestClose("outside-press", event);
    });
    dialog.addEventListener("cancel", (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.requestClose("escape-key", event);
    });
    dialog.addEventListener("close", (event) => {
      if (this.skipCloseEvent) {
        this.skipCloseEvent = false;
        return;
      }
      // Closed natively (a `method="dialog"` form, `dialog.close()`): ask
      // after the fact, and re-open on a veto.
      if (this.hasAttribute("open") && !this.emitChange("cancel", {}, "programmatic", event)) {
        dialog.showModal();
        return;
      }
      this.removeAttribute("open");
      this.dispatchCloseEvent("programmatic");
    });

    this.native = dialog;
    this.append(dialog);
    this.syncAllAttrs();
  }

  protected applyLabels() {
    this.native?.querySelector('[data-slot="dialog-close"]')?.setAttribute("aria-label", this.builtInLabel("close", "Close"));
  }

  /** Asks (a cancelable `cancel` event) and, unless vetoed, closes. */
  protected requestClose(reason: string, event?: Event) {
    if (!this.hasAttribute("open") || this.closing) return;
    if (!this.emitChange("cancel", {}, reason, event)) return;
    this.closeReason = reason;
    this.removeAttribute("open");
  }

  private dispatchCloseEvent(reason: string) {
    this.closeReason = "programmatic";
    this.dispatchEvent(new CustomEvent("close", { bubbles: true, detail: { reason } }));
  }

  private async finishClose(dialog: HTMLDialogElement) {
    if (!dialog.open || this.closing) return;
    this.closing = true;
    // Same state hooks as React's Dialog: `data-open` stays on through
    // the exit (the dialog is still showing), `data-closing` joins it.
    dialog.removeAttribute("data-opening");
    dialog.setAttribute("data-open", "true");
    dialog.setAttribute("data-state", "closing");
    dialog.setAttribute("data-closing", "true");

    if (!prefersReducedMotion()) {
      const controller = new AbortController();
      this.exitAbort?.abort();
      this.exitAbort = controller;
      await waitForExitTransition(dialog, { signal: controller.signal });
      if (controller.signal.aborted) {
        this.closing = false;
        return;
      }
    }

    this.skipCloseEvent = true;
    dialog.close();
    dialog.removeAttribute("data-state");
    dialog.removeAttribute("data-closing");
    dialog.removeAttribute("data-open");
    this.closing = false;
    this.dispatchCloseEvent(this.closeReason);
  }

  protected syncAttr(name: string, value: string | null) {
    const dialog = this.native as HTMLDialogElement | null;
    if (!dialog) return;

    switch (name) {
      case "open":
        if (value !== null && !dialog.open) {
          this.exitAbort?.abort();
          this.closing = false;
          dialog.removeAttribute("data-closing");
          dialog.removeAttribute("data-state");
          // `data-opening` for the first frame, then `data-open`: the
          // same sequence (and "true" values) as React's Dialog.
          dialog.setAttribute("data-opening", "true");
          dialog.removeAttribute("data-open");
          dialog.showModal();
          dialog.setAttribute("data-state", "open");
          requestAnimationFrame(() => {
            if (!dialog.hasAttribute("data-opening")) return;
            dialog.removeAttribute("data-opening");
            dialog.setAttribute("data-open", "true");
          });
        }
        if (value === null && dialog.open) {
          void this.finishClose(dialog);
        }
        break;
      case "title": {
        const heading = dialog.querySelector(`[data-slot="dialog-title"]`);
        if (heading && !heading.querySelector("*")) heading.textContent = value ?? "";
        break;
      }
      case "description": {
        const description = dialog.querySelector(`[data-slot="dialog-description"]`) as HTMLElement | null;
        if (!description) break;
        description.textContent = value ?? "";
        description.hidden = !value;
        if (value) dialog.setAttribute("aria-describedby", this.descriptionId);
        else dialog.removeAttribute("aria-describedby");
        break;
      }
      case "backdrop":
        if (value && value !== "default") dialog.setAttribute("data-backdrop", value);
        else dialog.removeAttribute("data-backdrop");
        break;
      case "show-close-button":
        break;
      case "side":
        dialog.setAttribute("data-side", value && value !== "" ? value : "center");
        break;
    }
  }

  disconnectedCallback() {
    this.exitAbort?.abort();
  }
}

customElements.define("kernel-dialog", KernelDialog);
