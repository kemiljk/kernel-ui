import { KernelElement, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import { findTriggerElement } from "../../utils/trigger";
import "./HoverCard.css";

let hoverCardCounter = 0;

/**
 * `<kernel-hover-card>` — a heavier Tooltip: same
 * `FloatingPositioner` + `popover="manual"` mechanism, but for richer,
 * multi-line/interactive content, so open/close aren't instant like
 * Tooltip's (0/0): `open-delay` avoids flashing the card on every
 * pointer pass, `close-delay` gives the pointer time to travel from
 * the trigger into the card itself. Defaults are 150ms open / 100ms
 * close — snappier than the old 400/200, still slower than
 * transitions.dev's ~80ms tooltip appear-delay because this surface
 * is interactive. Keyboard focus opens near-instantly regardless of
 * `open-delay`. Touch is short-circuited to skip the hover-delay path
 * entirely (no real hover on touch), relying on focus instead.
 *
 * Keyboard: the card follows its trigger in the DOM, so Tab moves from
 * the trigger into a link inside it, and focus anywhere in the card
 * keeps it open. Escape dismisses it (WCAG 1.4.13, as Tooltip does),
 * handing focus back to the trigger if it was inside the card, without
 * also closing a dialog the trigger sits in.
 *
 * Children: one element tagged `slot="trigger"`, everything else
 * becomes the card's content.
 *
 * Attributes: `placement` (default bottom), `align` (start/center/end,
 * default center), `offset` (px, default 8), `open-delay` (ms, default
 * 150), `close-delay` (ms, default 100).
 */
export class KernelHoverCard extends KernelElement {
  private readonly contentId = `kernel-hover-card-${++hoverCardCounter}`;
  private readonly positioner = new FloatingPositioner();
  private openTimer: ReturnType<typeof setTimeout> | undefined;
  private closeTimer: ReturnType<typeof setTimeout> | undefined;
  private exitAbort: AbortController | null = null;
  private open = false;
  private closing = false;
  private escapeListener: ((event: KeyboardEvent) => void) | null = null;
  /** Set while Escape hands focus back to the trigger, so that focus
   * doesn't immediately reopen the card it just dismissed. */
  private suppressFocusOpen = false;

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "group");
    content.setAttribute("popover", "manual");
    content.setAttribute("data-slot", "hover-card-content");
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

    const { placement, align, offset } = readFloatingAttributes(this);
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      triggerEl.setAttribute("aria-describedby", this.contentId);
      triggerEl.setAttribute("interestfor", this.contentId);
      this.positioner.attach(triggerEl, content, { placement, align, offset });

      const openDelay = Number(this.getAttribute("open-delay") ?? "150");
      const closeDelay = Number(this.getAttribute("close-delay") ?? "100");

      const show = (delay: number) => {
        clearTimeout(this.closeTimer);
        clearTimeout(this.openTimer);
        this.openTimer = setTimeout(() => {
          this.exitAbort?.abort();
          this.exitAbort = null;
          this.closing = false;
          this.open = true;
          content.removeAttribute("data-closing");
          this.positioner.setOpen(true);
          content.setAttribute("data-open", "true");
          content.showPopover?.();
          document.addEventListener("keydown", onEscape);
        }, delay);
      };

      /** Plays the exit while the card is still open, then hides it for
       * real — the reverse order (hide, then animate) leaves the browser
       * animating an element it has already pulled out of the top
       * layer. */
      const hideNow = async () => {
        if (!this.open && !this.closing) return;
        this.closing = true;
        content.removeAttribute("data-open");
        content.setAttribute("data-closing", "true");

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
        document.removeEventListener("keydown", onEscape);
      };

      // WCAG 1.4.13: content shown on hover or focus must be dismissible
      // without moving the pointer or focus. preventDefault keeps that
      // Escape from also closing a dialog the trigger sits in.
      const onEscape = (event: KeyboardEvent) => {
        if (event.key !== "Escape" || event.defaultPrevented || !this.open || this.closing) return;
        event.preventDefault();
        clearTimeout(this.openTimer);
        clearTimeout(this.closeTimer);
        if (content.contains(document.activeElement)) {
          this.suppressFocusOpen = true;
          triggerEl.focus();
          this.suppressFocusOpen = false;
        }
        void hideNow();
      };
      this.escapeListener = onEscape;

      const scheduleHide = () => {
        clearTimeout(this.openTimer);
        clearTimeout(this.closeTimer);
        this.closeTimer = setTimeout(() => {
          // The pointer left, but a keyboard user is still inside the card.
          if (content.contains(document.activeElement)) return;
          void hideNow();
        }, closeDelay);
      };

      /** Blur from the trigger or the card: stay open while focus moves
       * between the two (Tab from the trigger into a link in the card). */
      const hideOnBlur = (event: FocusEvent) => {
        const next = event.relatedTarget as Node | null;
        if (next && (content.contains(next) || triggerEl.contains(next))) return;
        scheduleHide();
      };

      const cancelHide = () => {
        clearTimeout(this.closeTimer);
        if (this.closing) {
          this.exitAbort?.abort();
          this.closing = false;
          this.open = true;
          content.removeAttribute("data-closing");
          content.setAttribute("data-open", "true");
          content.showPopover?.();
        }
      };

      triggerEl.addEventListener("pointerenter", (event) => {
        if ((event as PointerEvent).pointerType === "touch") return;
        show(openDelay);
      });
      triggerEl.addEventListener("pointerleave", scheduleHide);
      triggerEl.addEventListener("focus", () => {
        if (!this.suppressFocusOpen) show(0);
      });
      triggerEl.addEventListener("blur", hideOnBlur);
      content.addEventListener("pointerenter", cancelHide);
      content.addEventListener("pointerleave", scheduleHide);
      content.addEventListener("focusin", cancelHide);
      content.addEventListener("focusout", hideOnBlur);
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    clearTimeout(this.openTimer);
    clearTimeout(this.closeTimer);
    this.exitAbort?.abort();
    if (this.escapeListener) document.removeEventListener("keydown", this.escapeListener);
    // Removes the fallback path's window scroll/resize listeners if the
    // card is torn down while open (they'd otherwise reference a detached
    // element forever on browsers without CSS anchor positioning).
    this.positioner.destroy();
  }
}

customElements.define("kernel-hover-card", KernelHoverCard);
