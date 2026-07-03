import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, type FloatingPlacement } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import "./Popover.css";

let popoverCounter = 0;

/**
 * `<kernel-popover>` — `popover="auto"` on the content panel gets
 * native light-dismiss (outside click, Escape) and top-layer stacking
 * for free; the trigger is wired up with the native `popovertarget`
 * attribute, so open/close/toggle all work with zero JavaScript beyond
 * positioning. The one bit of JS here is mirroring the native `toggle`
 * event into an `open` attribute/event, the same as
 * `@kernelui-lib/react`'s own `<Popover>`.
 *
 * Children: one element tagged `slot="trigger"` (a `<kernel-button>`
 * or plain `<button>`/`<a>`), everything else becomes the popover's
 * content.
 *
 * Attributes: `placement` (top/bottom/left/right, default bottom).
 * Events: `toggle` `CustomEvent` (`event.detail.open`).
 */
export class KernelPopover extends KernelElement {
  private readonly contentId = `kernel-popover-${++popoverCounter}`;
  private readonly positioner = new FloatingPositioner();

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("popover", "auto");
    content.className = kernelClass("Popover", "content");
    return content;
  }

  connectedCallback() {
    if (this.native) return;

    const triggerSlot = this.querySelector('[slot="trigger"]');
    const rest: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node !== triggerSlot) rest.push(node);
    }
    for (const node of rest) node.parentNode?.removeChild(node);

    const content = this.createNative();
    content.append(...rest);

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      triggerEl.setAttribute("popovertarget", this.contentId);
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, {
        placement: (this.getAttribute("placement") as FloatingPlacement) || "bottom",
      });

      content.addEventListener("toggle", (event) => {
        const open = (event as ToggleEvent).newState === "open";
        triggerEl.setAttribute("aria-expanded", String(open));
        this.positioner.setOpen(open);
        this.dispatchEvent(new CustomEvent("toggle", { detail: { open }, bubbles: true }));
      });
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    // Drops the fallback path's window scroll/resize listeners if the
    // popover is removed while open (otherwise they leak, referencing a
    // detached element, on browsers without CSS anchor positioning).
    this.positioner.destroy();
  }
}

customElements.define("kernel-popover", KernelPopover);
