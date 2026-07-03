import { KernelElement, dataAttr, kernelClass } from "../../base";
import { FloatingPositioner, type FloatingPlacement } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import "./DropdownMenu.css";

let menuCounter = 0;

function handleMenuKeyDown(menu: HTMLElement, event: KeyboardEvent) {
  const items = Array.from(
    menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])'),
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
    case "Home":
      nextIndex = 0;
      break;
    case "End":
      nextIndex = items.length - 1;
      break;
    default:
      return;
  }

  event.preventDefault();
  items[nextIndex]?.focus();
}

/**
 * `<kernel-dropdown-menu>` — `role="menu"` on a `popover="auto"`
 * element: outside-click/Escape dismissal and top-layer stacking are
 * native to the popover; arrow-key roving between items is the one
 * part of the WAI-ARIA menu pattern with no native element, wired up
 * by hand.
 *
 * Children: one element tagged `slot="trigger"`, everything else
 * (`<kernel-menu-item>`/`<kernel-menu-separator>`) becomes the menu.
 *
 * Attributes: `placement` (default bottom).
 */
export class KernelDropdownMenu extends KernelElement {
  private readonly contentId = `kernel-dropdown-menu-${++menuCounter}`;
  private readonly positioner = new FloatingPositioner();

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "menu");
    content.setAttribute("popover", "auto");
    content.className = kernelClass("DropdownMenu", "content");
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
    content.addEventListener("keydown", (event) => handleMenuKeyDown(content, event));

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      triggerEl.setAttribute("popovertarget", this.contentId);
      triggerEl.setAttribute("aria-haspopup", "menu");
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, {
        placement: (this.getAttribute("placement") as FloatingPlacement) || "bottom",
      });

      content.addEventListener("toggle", (event) => {
        const open = (event as ToggleEvent).newState === "open";
        triggerEl.setAttribute("aria-expanded", String(open));
        this.positioner.setOpen(open);
        if (open) {
          requestAnimationFrame(() => {
            content.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
          });
        }
      });
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    // Drops the fallback path's window scroll/resize listeners if the menu
    // is removed while open (otherwise they leak, referencing a detached
    // element, on browsers without CSS anchor positioning).
    this.positioner.destroy();
  }
}

/** `<kernel-menu-item>` — a real `<button role="menuitem">`. Shared by
 * `<kernel-context-menu>`. Attributes: `disabled`, `destructive`
 * (boolean). Events: `select` fires on activation, after which the
 * nearest `[popover]` ancestor (the menu) is closed. */
export class KernelMenuItem extends KernelElement {
  static get observedAttributes() {
    return ["disabled", "destructive"];
  }

  protected createNative(): HTMLElement {
    const button = document.createElement("button");
    button.type = "button";
    button.setAttribute("role", "menuitem");
    button.tabIndex = -1;
    button.className = kernelClass("DropdownMenu", "item");
    button.addEventListener("click", () => {
      this.dispatchEvent(new CustomEvent("select", { bubbles: true }));
      (this.closest("[popover]") as (HTMLElement & { hidePopover?: () => void }) | null)?.hidePopover?.();
    });
    return button;
  }

  protected syncAttr(name: string, value: string | null) {
    const button = this.native as HTMLButtonElement | null;
    if (!button) return;
    if (name === "disabled") {
      button.disabled = value !== null;
      if (value !== null) button.setAttribute("aria-disabled", "true");
      else button.removeAttribute("aria-disabled");
    } else if (name === "destructive") {
      const flag = dataAttr(value !== null);
      if (flag) button.setAttribute("data-destructive", flag);
      else button.removeAttribute("data-destructive");
    }
  }
}

/** `<kernel-menu-separator>` — `role="separator"`. */
export class KernelMenuSeparator extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("role", "separator");
    div.className = kernelClass("DropdownMenu", "separator");
    return div;
  }
}

customElements.define("kernel-dropdown-menu", KernelDropdownMenu);
customElements.define("kernel-menu-item", KernelMenuItem);
customElements.define("kernel-menu-separator", KernelMenuSeparator);
