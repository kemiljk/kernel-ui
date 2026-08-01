import { KernelElement, dataAttr, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
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
 * Attributes: `placement` (default bottom), `align` (start/center/end,
 * default center), `offset` (px, default 8).
 */
export class KernelDropdownMenu extends KernelElement {
  private readonly contentId = `kernel-dropdown-menu-${++menuCounter}`;
  private readonly positioner = new FloatingPositioner();

  protected createNative(): HTMLElement {
    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "menu");
    content.setAttribute("popover", "auto");
    content.setAttribute("data-slot", "dropdown-menu-content");
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

    const { placement, align, offset } = readFloatingAttributes(this);
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      triggerEl.setAttribute("popovertarget", this.contentId);
      triggerEl.setAttribute("aria-haspopup", "menu");
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, { placement, align, offset });

      content.addEventListener("toggle", (event) => {
        const open = (event as ToggleEvent).newState === "open";
        triggerEl.setAttribute("aria-expanded", String(open));
        this.positioner.setOpen(open);
        if (open) {
          content.setAttribute("data-open", "");
          requestAnimationFrame(() => {
            content.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
          });
        } else {
          content.removeAttribute("data-open");
        }
      });
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    this.positioner.destroy();
  }
}

/**
 * `<kernel-menu-item>` — a real `<button role="menuitem">` by default.
 * Set `href` to render as an `<a>` instead (native link semantics for
 * navigation, new-tab, etc.). Attributes: `disabled`, `destructive`,
 * `href`, `target`, `rel`. Events: `select` fires on activation, after
 * which the nearest `[popover]` ancestor (the menu) is closed — without
 * preventingDefault on the click, so links still navigate.
 */
export class KernelMenuItem extends KernelElement {
  static get observedAttributes() {
    return ["disabled", "destructive", "href", "target", "rel"];
  }

  protected createNative(): HTMLElement {
    const href = this.getAttribute("href");
    const el = href
      ? Object.assign(document.createElement("a"), { href })
      : Object.assign(document.createElement("button"), { type: "button" });
    el.setAttribute("role", "menuitem");
    el.tabIndex = -1;
    el.setAttribute("data-slot", "menu-item");
    el.className = kernelClass("DropdownMenu", "item");

    el.addEventListener("focus", () => el.setAttribute("data-highlighted", ""));
    el.addEventListener("blur", () => el.removeAttribute("data-highlighted"));
    el.addEventListener("keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || event.key !== " ") return;
      if (el.getAttribute("aria-disabled") === "true") return;
      event.preventDefault();
      el.click();
    });
    el.addEventListener("click", (event) => {
      if (el.getAttribute("aria-disabled") === "true") {
        event.preventDefault();
        return;
      }
      this.dispatchEvent(new CustomEvent("select", { bubbles: true }));
      (this.closest("[popover]") as (HTMLElement & { hidePopover?: () => void }) | null)?.hidePopover?.();
    });
    return el;
  }

  protected syncAttr(name: string, value: string | null) {
    const el = this.native;
    if (!el) return;
    if (name === "disabled") {
      const disabled = value !== null;
      if (el instanceof HTMLButtonElement) el.disabled = disabled;
      if (disabled) {
        el.setAttribute("aria-disabled", "true");
        el.setAttribute("data-disabled", "");
      } else {
        el.removeAttribute("aria-disabled");
        el.removeAttribute("data-disabled");
      }
    } else if (name === "destructive") {
      const flag = dataAttr(value !== null);
      if (flag) el.setAttribute("data-destructive", flag);
      else el.removeAttribute("data-destructive");
    } else if (name === "href" && el instanceof HTMLAnchorElement) {
      if (value === null) el.removeAttribute("href");
      else el.href = value;
    } else if (name === "target" && el instanceof HTMLAnchorElement) {
      if (value === null) el.removeAttribute("target");
      else el.target = value;
    } else if (name === "rel" && el instanceof HTMLAnchorElement) {
      if (value === null) el.removeAttribute("rel");
      else el.rel = value;
    }
  }
}

/** `<kernel-menu-separator>` — `role="separator"`. */
export class KernelMenuSeparator extends KernelElement {
  protected createNative(): HTMLElement {
    const div = document.createElement("div");
    div.setAttribute("role", "separator");
    div.setAttribute("data-slot", "menu-separator");
    div.className = kernelClass("DropdownMenu", "separator");
    return div;
  }
}

customElements.define("kernel-dropdown-menu", KernelDropdownMenu);
customElements.define("kernel-menu-item", KernelMenuItem);
customElements.define("kernel-menu-separator", KernelMenuSeparator);
