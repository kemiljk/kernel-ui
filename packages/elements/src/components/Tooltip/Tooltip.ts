import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
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
 * Attributes: `placement` (top/bottom/left/right, default top),
 * `align` (start/center/end, default center), `offset` (px, default 8),
 * `open-delay` / `close-delay` (ms, default 0), `arrow` (boolean).
 */
export class KernelTooltip extends KernelElement {
  private readonly contentId = `kernel-tooltip-${++tooltipCounter}`;
  private readonly positioner = new FloatingPositioner();
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private exitAbort: AbortController | null = null;
  private open = false;
  private closing = false;

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "tooltip");
    content.setAttribute("popover", "manual");
    content.setAttribute("data-slot", "tooltip-content");
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

    const { placement, align, offset } = readFloatingAttributes(this, { placement: "top" });
    const openDelay = Number(this.getAttribute("open-delay") ?? "0");
    const closeDelay = Number(this.getAttribute("close-delay") ?? "0");
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);

    if (this.hasAttribute("arrow")) {
      const arrow = document.createElement("span");
      arrow.setAttribute("data-slot", "tooltip-arrow");
      arrow.setAttribute("aria-hidden", "true");
      arrow.className = kernelClass("Tooltip", "arrow");
      content.append(arrow);
    }

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      triggerEl.setAttribute("aria-describedby", this.contentId);
      triggerEl.setAttribute("interestfor", this.contentId);
      this.positioner.attach(triggerEl, content, { placement, align, offset });

      const showNow = () => {
        this.exitAbort?.abort();
        this.exitAbort = null;
        clearTimeout(this.openTimer);
        clearTimeout(this.closeTimer);
        this.closing = false;
        content.removeAttribute("data-closing");
        content.setAttribute("data-opening", "");
        content.setAttribute("data-open", "");
        this.open = true;
        this.positioner.setOpen(true);
        content.showPopover?.();
        requestAnimationFrame(() => content.removeAttribute("data-opening"));
      };

      const show = (delay: number) => {
        clearTimeout(this.closeTimer);
        if (this.open && !this.closing) {
          clearTimeout(this.openTimer);
          return;
        }
        clearTimeout(this.openTimer);
        this.openTimer = setTimeout(showNow, delay);
      };

      const hideNow = async () => {
        clearTimeout(this.openTimer);
        clearTimeout(this.closeTimer);
        if (!this.open && !this.closing) return;
        this.closing = true;
        content.removeAttribute("data-opening");
        content.removeAttribute("data-open");
        content.setAttribute("data-closing", "");

        if (!prefersReducedMotion()) {
          const controller = new AbortController();
          this.exitAbort?.abort();
          this.exitAbort = controller;
          await waitForExitTransition(content, { signal: controller.signal });
          if (controller.signal.aborted) return;
        }

        this.open = false;
        this.closing = false;
        content.removeAttribute("data-closing");
        this.positioner.setOpen(false);
        content.hidePopover?.();
      };

      const scheduleHide = () => {
        clearTimeout(this.openTimer);
        this.closeTimer = setTimeout(() => {
          void hideNow();
        }, closeDelay);
      };

      const cancelHide = () => {
        clearTimeout(this.closeTimer);
        if (this.closing) {
          this.exitAbort?.abort();
          this.closing = false;
          content.removeAttribute("data-closing");
          content.setAttribute("data-open", "");
          this.open = true;
          content.showPopover?.();
        }
      };

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
    this.exitAbort?.abort();
    this.positioner.destroy();
  }
}

customElements.define("kernel-tooltip", KernelTooltip);
