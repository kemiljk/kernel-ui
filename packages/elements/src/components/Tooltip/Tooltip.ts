import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, type FloatingPlacement } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import "./Tooltip.css";

let tooltipCounter = 0;

/**
 * `<kernel-tooltip>` — `popover="manual"` (driven from hover/focus, not
 * a click toggle) for top-layer stacking + `showPopover()`/
 * `hidePopover()`, positioned with the same `FloatingPositioner` as
 * `<kernel-popover>`. `interestfor` is set on the trigger as a
 * forward-looking, currently-inert stand-in for the emerging native
 * hover-intent attribute — today the hover/focus listeners below are
 * what actually show and hide it.
 *
 * Children: one element tagged `slot="trigger"`, everything else
 * becomes the tooltip's content.
 *
 * Attributes: `placement` (top/bottom/left/right, default top).
 */
export class KernelTooltip extends KernelElement {
  private readonly contentId = `kernel-tooltip-${++tooltipCounter}`;
  private readonly positioner = new FloatingPositioner();

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "tooltip");
    content.setAttribute("popover", "manual");
    content.className = kernelClass("Tooltip", "content");
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
        placement: (this.getAttribute("placement") as FloatingPlacement) || "top",
      });

      const show = () => {
        this.positioner.setOpen(true);
        content.showPopover?.();
      };
      const hide = () => {
        this.positioner.setOpen(false);
        content.hidePopover?.();
      };
      triggerEl.addEventListener("mouseenter", show);
      triggerEl.addEventListener("mouseleave", hide);
      triggerEl.addEventListener("focus", show);
      triggerEl.addEventListener("blur", hide);
    }

    this.native = content;
    this.append(content);
  }
}

customElements.define("kernel-tooltip", KernelTooltip);
