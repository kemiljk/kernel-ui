import { KernelElement, dataAttr, kernelClass } from "../../base";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import { playMorphOpen, playMorphClose } from "../../utils/menuMorph";
import "./DropdownMenu.css";

let menuCounter = 0;

/** A popover a `KernelMenuItem` can ask to close itself in its own way
 * — see that class's click handler. */
type MenuClosable = HTMLElement & {
  hidePopover?: () => void;
  __kernelMenuClose?: () => void;
};

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

let menuMorphCounter = 0;

/**
 * `<kernel-dropdown-menu-morph>` — `<kernel-dropdown-menu>`'s trigger-
 * morphs-into-menu variant, transitions.dev's "plus menu morph" recipe:
 * the panel's own box animates width/height/border-radius out from the
 * trigger's exact footprint (see `utils/menuMorph.ts`'s FLIP technique)
 * instead of scaling/fading in place.
 *
 * That forces `popover="manual"` instead of `"auto"`: a popover's hide
 * is deliberately not cancelable, so there's no way to defer it long
 * enough for the shrink-back-to-the-trigger animation to play first —
 * the same tradeoff `<kernel-context-menu>` already makes for its own
 * manual popover, with outside-click/Escape dismissal wired up by hand
 * to replace what `popover="auto"` gives for free.
 *
 * Reuses `<kernel-menu-item>`/`<kernel-menu-separator>` directly, same
 * as `<kernel-context-menu>` does — only the trigger/panel open-close
 * mechanism differs.
 *
 * Children: one element tagged `slot="trigger"`, everything else
 * becomes the menu. Attributes: `placement` (default bottom), `align`
 * (start/center/end, default center), `offset` (px, default 8).
 */
export class KernelDropdownMenuMorph extends KernelElement {
  private readonly contentId = `kernel-dropdown-menu-morph-${++menuMorphCounter}`;
  private readonly positioner = new FloatingPositioner();
  private open = false;
  private closeController: AbortController | null = null;
  private triggerEl: HTMLElement | null = null;

  connectedCallback() {
    if (this.native) return;

    const triggerSlot = this.querySelector('[slot="trigger"]');
    const rest: Node[] = [];
    for (const node of Array.from(this.childNodes)) {
      if (node !== triggerSlot) rest.push(node);
    }
    for (const node of rest) node.parentNode?.removeChild(node);

    const content = document.createElement("div");
    content.id = this.contentId;
    content.setAttribute("role", "menu");
    content.setAttribute("popover", "manual");
    content.setAttribute("data-slot", "dropdown-menu-morph-content");
    content.className = kernelClass("DropdownMenu", "morphContent");
    content.append(...rest);
    content.addEventListener("keydown", (event) => handleMenuKeyDown(content, event));
    (content as MenuClosable).__kernelMenuClose = () => this.close();

    const { placement, align, offset } = readFloatingAttributes(this);
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);

    if (triggerSlot) {
      const triggerEl = findTriggerElement(triggerSlot);
      this.triggerEl = triggerEl;
      triggerEl.setAttribute("aria-haspopup", "menu");
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, { placement, align, offset });
      triggerEl.addEventListener("click", () => (this.open ? this.close() : this.openMenu()));
    }

    this.native = content;
    this.append(content);
  }

  disconnectedCallback() {
    this.positioner.destroy();
    this.closeController?.abort();
  }

  private openMenu() {
    this.closeController?.abort();
    this.closeController = null;
    const content = this.native;
    const trigger = this.triggerEl;
    if (!content || !trigger) return;

    this.open = true;
    this.triggerEl?.setAttribute("aria-expanded", "true");
    this.positioner.setOpen(true);
    // Written directly rather than through a later render pass: the
    // FLIP override below needs [data-open]'s transition rule already
    // active the instant the panel is shown, and removing data-closing
    // matters too — a reopen landing mid-close would otherwise leave
    // both attributes set at once, and [data-closing]'s rule (declared
    // later in DropdownMenu.css) would win the tie on equal
    // specificity, keeping the calmer close timing for what should be
    // the bouncier open.
    content.removeAttribute("data-closing");
    content.setAttribute("data-open", "");

    playMorphOpen(trigger, content, () => {
      // A reopen landing mid-close cancels that close's wait (below)
      // before it ever calls hidePopover(), so the popover can still
      // be showing here — showPopover() throws on an already-shown one.
      try {
        content.showPopover?.();
      } catch {
        /* already showing */
      }
    });

    requestAnimationFrame(() => {
      content.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!content.contains(target) && !trigger.contains(target)) this.close();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.close();
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    content.addEventListener(
      "toggle",
      (event) => {
        if ((event as ToggleEvent).newState === "closed") {
          document.removeEventListener("pointerdown", handlePointerDown);
          document.removeEventListener("keydown", handleKeyDown);
        }
      },
      { once: true },
    );
  }

  private close() {
    if (!this.open) return;
    const content = this.native;
    const trigger = this.triggerEl;
    if (!content || !trigger) return;

    this.open = false;
    this.triggerEl?.setAttribute("aria-expanded", "false");
    this.positioner.setOpen(false);
    content.removeAttribute("data-open");
    content.setAttribute("data-closing", "");

    const controller = new AbortController();
    this.closeController?.abort();
    this.closeController = controller;

    void playMorphClose(trigger, content, controller.signal).then(() => {
      if (controller.signal.aborted) return;
      content.removeAttribute("data-closing");
    });
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
      const popover = this.closest("[popover]") as MenuClosable | null;
      // `__kernelMenuClose`, if the closest popover set one, replaces a
      // bare hidePopover() with whatever that popover's own close needs
      // to do first — `KernelDropdownMenuMorph` sets this so selecting
      // an item still plays the shrink-back-to-the-trigger animation
      // instead of the panel vanishing outright. `KernelDropdownMenu`
      // and `KernelContextMenu` never set it, so they fall through to
      // the plain hidePopover() exactly as before.
      if (popover?.__kernelMenuClose) popover.__kernelMenuClose();
      else popover?.hidePopover?.();
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
customElements.define("kernel-dropdown-menu-morph", KernelDropdownMenuMorph);
customElements.define("kernel-menu-item", KernelMenuItem);
customElements.define("kernel-menu-separator", KernelMenuSeparator);
