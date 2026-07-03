import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, type FloatingPlacement } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import "./HoverCard.css";

let hoverCardCounter = 0;

/**
 * `<kernel-hover-card>` — a heavier Tooltip: same
 * `FloatingPositioner` + `popover="manual"` mechanism, but for richer,
 * multi-line/interactive content, so open/close aren't instant like
 * Tooltip's: `open-delay` avoids flashing the card on every pointer
 * pass, `close-delay` gives the pointer time to travel from the
 * trigger into the card itself. Keyboard focus opens near-instantly
 * regardless of `open-delay`. Touch is short-circuited to skip the
 * hover-delay path entirely (no real hover on touch), relying on focus
 * instead.
 *
 * Children: one element tagged `slot="trigger"`, everything else
 * becomes the card's content.
 *
 * Attributes: `placement` (default bottom), `open-delay` (ms, default
 * 400), `close-delay` (ms, default 200).
 */
export class KernelHoverCard extends KernelElement {
  private readonly contentId = `kernel-hover-card-${++hoverCardCounter}`;
  private readonly positioner = new FloatingPositioner();
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "group");
    content.setAttribute("popover", "manual");
    content.className = kernelClass("HoverCard", "content");
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
      triggerEl.setAttribute("aria-describedby", this.contentId);
      triggerEl.setAttribute("interestfor", this.contentId);
      this.positioner.attach(triggerEl, content, {
        placement: (this.getAttribute("placement") as FloatingPlacement) || "bottom",
      });

      const openDelay = Number(this.getAttribute("open-delay") ?? "400");
      const closeDelay = Number(this.getAttribute("close-delay") ?? "200");

      const show = (delay: number) => {
        clearTimeout(this.closeTimer);
        clearTimeout(this.openTimer);
        this.openTimer = setTimeout(() => {
          this.positioner.setOpen(true);
          content.showPopover?.();
        }, delay);
      };
      const scheduleHide = () => {
        clearTimeout(this.openTimer);
        this.closeTimer = setTimeout(() => {
          this.positioner.setOpen(false);
          content.hidePopover?.();
        }, closeDelay);
      };
      const cancelHide = () => clearTimeout(this.closeTimer);

      triggerEl.addEventListener("pointerenter", (event) => {
        if ((event as PointerEvent).pointerType === "touch") return;
        show(openDelay);
      });
      triggerEl.addEventListener("pointerleave", scheduleHide);
      triggerEl.addEventListener("focus", () => show(0));
      triggerEl.addEventListener("blur", scheduleHide);
      content.addEventListener("pointerenter", cancelHide);
      content.addEventListener("pointerleave", scheduleHide);
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    // Removes the fallback path's window scroll/resize listeners if the
    // card is torn down while open (they'd otherwise reference a detached
    // element forever on browsers without CSS anchor positioning).
    this.positioner.destroy();
  }
}

customElements.define("kernel-hover-card", KernelHoverCard);
