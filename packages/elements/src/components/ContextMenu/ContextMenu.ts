import { KernelElement, kernelClass } from "../../base";
import "../DropdownMenu/DropdownMenu";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import {
  clearMenuPointerHighlight,
  contextMenuReturnTarget,
  focusMenuOnOpen,
  highlightMenuItemUnderPointer,
  returnFocusFromMenu,
  roveMenuItems,
} from "../../utils/menuFocus";
import "./ContextMenu.css";

const MARGIN = 8;

/**
 * `<kernel-context-menu>` — the same `role="menu"` primitives as
 * `<kernel-dropdown-menu>` (`<kernel-menu-item>`/
 * `<kernel-menu-separator>` are the same tags, reused directly), only
 * the trigger and positioning differ: this opens on the native
 * `contextmenu` event and is placed at the cursor instead of anchored
 * to an element, so `popover="manual"` plus manually-managed
 * `showPopover()`/`hidePopover()` replaces `popovertarget`, and
 * outside-click/scroll/Escape dismissal are wired up by hand (the
 * things `popover="auto"` would otherwise give for free).
 *
 * Children: one element tagged `slot="trigger"` — the area that opens
 * the menu on right-click — everything else becomes the menu content.
 *
 * A right-click focuses the menu itself, not its first item, so nothing is
 * highlighted until the pointer reaches an item or an arrow key is pressed
 * (ArrowDown lands on the first item, ArrowUp on the last). The keyboard's
 * own context-menu key opens straight onto the first item. Focus and
 * highlight are shared with `<kernel-dropdown-menu>` through
 * `utils/menuFocus.ts`. Escape, a selection or a scroll returns focus to
 * whatever had it before the menu opened (else the right-clicked element,
 * else the trigger region); an outside press leaves focus where it put it.
 */
export class KernelContextMenu extends KernelElement {
  connectedCallback() {
    if (this.native) return;

    const triggerSlot = this.querySelector('[slot="trigger"]');
    const rest: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node !== triggerSlot) rest.push(node);
    }
    for (const node of rest) node.parentNode?.removeChild(node);
    if (triggerSlot) triggerSlot.parentNode?.removeChild(triggerSlot);

    const triggerArea = document.createElement("div");
    triggerArea.className = kernelClass("ContextMenu", "trigger");
    if (triggerSlot) triggerArea.append(triggerSlot);

    const content = document.createElement("div");
    content.setAttribute("role", "menu");
    content.setAttribute("popover", "manual");
    content.className = kernelClass("ContextMenu", "content");
    content.tabIndex = -1;
    content.append(...rest);

    // Play the exit before hiding, the same as React's usePopoverExit: once
    // hidePopover() runs, the panel is gone and can't animate.
    let closing = false;
    let returnTarget: HTMLElement | null = null;
    // Focus as it was when the opening press began; see contextMenuReturnTarget.
    let focusAtPress: Element | null = null;
    triggerArea.addEventListener("pointerdown", () => {
      focusAtPress = document.activeElement;
    }, { capture: true });
    const close = async (returnFocus = true) => {
      if (closing || !content.matches(":popover-open")) return;
      if (returnFocus) returnFocusFromMenu(content, returnTarget);
      closing = true;
      content.setAttribute("data-closing", "true");
      if (!prefersReducedMotion()) await waitForExitTransition(content);
      content.removeAttribute("data-closing");
      content.hidePopover?.();
      closing = false;
    };

    // A selection closes through here too, so it gets the exit and the
    // focus return instead of a bare hidePopover() from the item.
    (content as HTMLElement & { __kernelMenuClose?: () => void }).__kernelMenuClose = () => void close();

    triggerArea.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      // Chromium fires contextmenu as a PointerEvent, with an empty pointerType
      // when the context-menu key or Shift+F10 opened it. Browsers that fire a
      // plain MouseEvent get the pointer behaviour; arrow keys still work.
      const fromKeyboard = (event as Partial<PointerEvent>).pointerType === "";
      const focusedBefore = fromKeyboard ? document.activeElement : (focusAtPress ?? document.activeElement);
      focusAtPress = null;
      // A right-click while the menu is still up (or closing) finds focus in
      // the menu itself; keep the target recorded when it first opened.
      if (!content.contains(focusedBefore)) {
        returnTarget = contextMenuReturnTarget(triggerArea, event.target, focusedBefore);
      }
      content.style.top = `${event.clientY}px`;
      content.style.left = `${event.clientX}px`;
      content.showPopover?.();

      requestAnimationFrame(() => {
        focusMenuOnOpen(content, fromKeyboard ? "first" : "pointer");
        const rect = content.getBoundingClientRect();
        const maxLeft = window.innerWidth - rect.width - MARGIN;
        const maxTop = window.innerHeight - rect.height - MARGIN;
        const clampedLeft = Math.max(MARGIN, Math.min(event.clientX, maxLeft));
        const clampedTop = Math.max(MARGIN, Math.min(event.clientY, maxTop));
        content.style.left = `${clampedLeft}px`;
        content.style.top = `${clampedTop}px`;

        // Scales the panel in from wherever was actually right-clicked,
        // not a fixed center — same cursor-relative-percentage approach
        // as the anchored components' FloatingPositioner, just computed
        // by hand here since a cursor position isn't an anchor element.
        const clamp = (value: number) => Math.max(0, Math.min(100, value));
        const originX = rect.width ? clamp(((event.clientX - clampedLeft) / rect.width) * 100) : 50;
        const originY = rect.height ? clamp(((event.clientY - clampedTop) / rect.height) * 100) : 50;
        content.style.setProperty("--kernel-transform-origin", `${originX}% ${originY}%`);
      });

      const handlePointerDown = (pointerEvent: PointerEvent) => {
        if (!content.contains(pointerEvent.target as Node)) void close(false);
      };
      const handleKeyDown = (keyEvent: KeyboardEvent) => {
        if (keyEvent.key === "Escape") close();
      };
      const handleScroll = () => close();

      document.addEventListener("pointerdown", handlePointerDown);
      document.addEventListener("keydown", handleKeyDown);
      window.addEventListener("scroll", handleScroll, true);
      content.addEventListener(
        "toggle",
        (toggleEvent) => {
          if ((toggleEvent as ToggleEvent).newState === "closed") {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", handleScroll, true);
          }
        },
        { once: true },
      );
    });

    content.addEventListener("keydown", (event) => roveMenuItems(content, event));
    content.addEventListener("pointermove", (event) => highlightMenuItemUnderPointer(content, event));
    content.addEventListener("pointerleave", () => clearMenuPointerHighlight(content));

    this.native = triggerArea;
    this.append(triggerArea, content);
  }
}

customElements.define("kernel-context-menu", KernelContextMenu);
