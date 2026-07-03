import { KernelElement, kernelClass } from "../../base";
import "../DropdownMenu/DropdownMenu";
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
    content.append(...rest);

    const close = () => content.hidePopover?.();

    triggerArea.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      content.style.top = `${event.clientY}px`;
      content.style.left = `${event.clientX}px`;
      content.showPopover?.();

      requestAnimationFrame(() => {
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
        if (!content.contains(pointerEvent.target as Node)) close();
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

    content.addEventListener("keydown", (event) => {
      const items = Array.from(
        content.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
      );
      if (items.length === 0) return;
      const currentIndex = items.indexOf(document.activeElement as HTMLElement);
      let nextIndex: number | null = null;
      switch (event.key) {
        case "ArrowDown":
          nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % items.length;
          break;
        case "ArrowUp":
          nextIndex = currentIndex === -1 ? items.length - 1 : (currentIndex - 1 + items.length) % items.length;
          break;
        default:
          return;
      }
      event.preventDefault();
      items[nextIndex]?.focus();
    });

    this.native = triggerArea;
    this.append(triggerArea, content);
  }
}

customElements.define("kernel-context-menu", KernelContextMenu);
