import { KernelElement, dataAttr, kernelClass } from "../../base";
import { inputModality } from "../../utils/changeDetails";
import { attachPopoverReasons, type PopoverReasonController } from "../../utils/popoverReasons";
import { FloatingPositioner, readFloatingAttributes } from "../../utils/floatingPosition";
import { findTriggerElement } from "../../utils/trigger";
import { playMorphOpen, playMorphClose } from "../../utils/menuMorph";
import {
  clearMenuPointerHighlight,
  focusMenuOnOpen,
  highlightMenuItemUnderPointer,
  menuTriggerKeyIntent,
  returnFocusFromMenu,
  roveMenuItems,
  type MenuOpenFocus,
} from "../../utils/menuFocus";
import "./DropdownMenu.css";

let menuCounter = 0;

/** A popover a `KernelMenuItem` can ask to close itself in its own way
 * — see that class's click handler. */
type MenuClosable = HTMLElement & {
  hidePopover?: () => void;
  /** Close after an item was chosen; the click says pointer or keyboard. */
  __kernelMenuClose?: (event?: Event) => void;
};

/**
 * How the menu was opened decides where focus lands (see
 * `utils/menuFocus.ts`): a pointer open focuses the menu container with
 * nothing highlighted, a keyboard open focuses the first item, or the last
 * for ArrowUp. The element twin of React's `useMenuOpenFocus`, shared by
 * all three presentations, which differ only in what `open` does.
 */
function wireMenuOpenFocus(
  trigger: HTMLElement | null,
  menu: HTMLElement,
  { isOpen, open }: { isOpen: () => boolean; open: () => void },
  signal?: AbortSignal,
) {
  let intent: MenuOpenFocus = "first";
  const focusOnOpen = () => {
    const next = intent;
    intent = "first";
    focusMenuOnOpen(menu, next);
  };

  menu.tabIndex = -1;
  menu.addEventListener("keydown", (event) => roveMenuItems(menu, event), { signal });
  menu.addEventListener("pointermove", (event) => highlightMenuItemUnderPointer(menu, event), { signal });
  menu.addEventListener("pointerleave", () => clearMenuPointerHighlight(menu), { signal });
  trigger?.addEventListener("pointerdown", () => {
    intent = "pointer";
  }, { signal });
  trigger?.addEventListener("keydown", (event) => {
    const next = menuTriggerKeyIntent(event.key);
    if (!next) return;
    intent = next;
    // Enter and Space open through the trigger's own activation.
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    if (isOpen()) focusOnOpen();
    else open();
  }, { signal });

  return {
    focusOnOpen,
    resetIntent: () => {
      intent = "first";
    },
  };
}

/** Names the `role="menu"` after the button that opens it (APG menu
 * button): `aria-labelledby` the trigger, giving it an id if it has none. */
function labelMenuByTrigger(menu: HTMLElement, trigger: HTMLElement) {
  if (!trigger.id) trigger.id = `${menu.id}-trigger`;
  menu.setAttribute("aria-labelledby", trigger.id);
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
 * default center), `offset` (px, default 8). `presentation="disclosure"`
 * uses a native details/summary in the page's stacking context; provide
 * <summary slot="trigger">. CSS owns entry/exit without a top-layer backdrop.
 *
 * Focus follows the WAI-ARIA menu button pattern. Opening from the keyboard
 * (Enter, Space, ArrowDown) focuses the first item, and ArrowUp opens on the
 * last. Opening with a pointer focuses the menu itself, so no item is
 * highlighted until the pointer reaches one or a key is pressed. After that
 * the highlight follows the pointer by moving focus, so only one row is ever
 * highlighted, and focus rings show only for the keyboard.
 *
 * Events: a bubbling, cancelable `beforetoggle` `CustomEvent` before the
 * menu opens or closes, `detail: { open, reason }` — `"trigger-press"`,
 * `"escape-key"`, `"outside-press"`, `"focus-out"` (disclosure only),
 * `"item-press"`, `"item-keyboard"` or `"programmatic"`. `preventDefault()`
 * keeps the menu as it is (e.g. veto `"item-keyboard"` to keep it open
 * while someone works through it with the keyboard).
 */
export class KernelDropdownMenu extends KernelElement {
  private readonly contentId = `kernel-dropdown-menu-${++menuCounter}`;
  private readonly positioner = new FloatingPositioner();
  private disclosure: HTMLDetailsElement | null = null;
  private disclosureListeners: AbortController | null = null;
  private reasons: PopoverReasonController<"item-press" | "item-keyboard"> | null = null;

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
    if (this.disclosure) { this.listenToDisclosure(); return; }
    if (this.native) return;
    if (this.getAttribute("presentation") === "disclosure") {
      this.createDisclosure();
      return;
    }

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

    const triggerEl = triggerSlot ? findTriggerElement(triggerSlot) : null;
    const openFocus = wireMenuOpenFocus(triggerEl, content, {
      isOpen: () => content.matches(":popover-open"),
      open: () => content.showPopover?.(),
    });

    if (triggerEl) {
      triggerEl.setAttribute("popovertarget", this.contentId);
      labelMenuByTrigger(content, triggerEl);
      triggerEl.setAttribute("aria-haspopup", "menu");
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, { placement, align, offset });

      this.reasons = attachPopoverReasons<"item-press" | "item-keyboard">(
        content,
        () => triggerEl,
        (open, reason, event) => this.emitChange("beforetoggle", { open }, reason, event),
      );
      (content as MenuClosable).__kernelMenuClose = (event) =>
        this.reasons?.closeWith(itemReason(event), event);
      content.addEventListener("toggle", (event) => {
        const open = (event as ToggleEvent).newState === "open";
        triggerEl.setAttribute("aria-expanded", String(open));
        this.positioner.setOpen(open);
        if (open) {
          content.setAttribute("data-open", "true");
          requestAnimationFrame(() => openFocus.focusOnOpen());
        } else {
          content.removeAttribute("data-open");
          openFocus.resetIntent();
        }
      });
    }

    this.native = content;
    this.append(content);
  }

  private createDisclosure() {
    // A summary is the native trigger, not a button nested in a summary.
    const summary = this.querySelector<HTMLElement>('summary[slot="trigger"]');
    if (!summary) throw new Error('A disclosure menu requires <summary slot="trigger">');
    const details = document.createElement("details");
    details.className = kernelClass("DropdownMenu", "disclosure");
    const { placement, align, offset } = readFloatingAttributes(this);
    details.setAttribute("data-placement", placement);
    details.setAttribute("data-align", align);
    details.style.setProperty("--kernel-menu-offset", `${offset}px`);
    summary.classList.add(kernelClass("DropdownMenu", "disclosureTrigger"));
    summary.setAttribute("aria-haspopup", "menu");
    summary.setAttribute("aria-controls", this.contentId);
    summary.setAttribute("aria-expanded", "false");
    const content = this.createNative();
    labelMenuByTrigger(content, summary);
    content.removeAttribute("popover");
    content.classList.add(kernelClass("DropdownMenu", "disclosureContent"));
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);
    content.inert = true;
    (content as MenuClosable).__kernelMenuClose = (event) => this.closeDisclosure(itemReason(event), event);
    // The summary's click is what toggles <details>, and it's cancelable.
    summary.addEventListener("click", (event) => {
      if (!this.emitChange("beforetoggle", { open: !details.open }, "trigger-press", event)) event.preventDefault();
    });
    for (const node of Array.from(this.childNodes)) {
      if (node !== summary) content.append(node);
    }
    details.append(summary, content);
    this.native = content;
    this.disclosure = details;
    this.append(details);
    this.listenToDisclosure();
  }

  private closeDisclosure(reason: string, event?: Event) {
    if (!this.disclosure?.open) return;
    if (!this.emitChange("beforetoggle", { open: false }, reason, event)) return;
    if (this.native?.contains(document.activeElement)) {
      this.disclosure.querySelector<HTMLElement>("summary")?.focus();
    }
    this.disclosure.open = false;
  }

  private listenToDisclosure() {
    this.disclosureListeners?.abort();
    const controller = new AbortController();
    this.disclosureListeners = controller;
    const { signal } = controller;
    const details = this.disclosure!;
    const content = this.native!;
    const openFocus = wireMenuOpenFocus(details.querySelector("summary"), content, {
      isOpen: () => details.open,
      open: () => {
        if (this.emitChange("beforetoggle", { open: true }, "trigger-press")) details.open = true;
      },
    }, signal);
    details.addEventListener("toggle", () => {
      details.querySelector("summary")?.setAttribute("aria-expanded", String(details.open));
      content.inert = !details.open;
      if (details.open) content.setAttribute("data-open", "true");
      else content.removeAttribute("data-open");
      // WebKit exposes the previously skipped details subtree after layout.
      if (details.open) requestAnimationFrame(() => requestAnimationFrame(() => {
        if (details.open) openFocus.focusOnOpen();
      }));
      else openFocus.resetIntent();
    }, { signal });
    // A transient blur during a touch tap must not pre-toggle the summary.
    document.addEventListener("focusin", (event) => {
      if (details.open && !details.contains(event.target as Node)) this.closeDisclosure("focus-out", event);
    }, { signal });
    document.addEventListener("pointerdown", (event) => {
      if (details.open && !details.contains(event.target as Node)) this.closeDisclosure("outside-press", event);
    }, { signal });
    document.addEventListener("keydown", (event) => {
      if (details.open && event.key === "Escape" && !event.defaultPrevented) {
        event.preventDefault();
        this.closeDisclosure("escape-key", event);
      }
    }, { signal });
  }

  disconnectedCallback() {
    this.positioner.destroy();
    this.disclosureListeners?.abort();
  }
}

function itemReason(event?: Event): "item-press" | "item-keyboard" {
  return inputModality(event) === "keyboard" ? "item-keyboard" : "item-press";
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
 * Events: the same cancelable `beforetoggle` as `<kernel-dropdown-menu>`.
 */
export class KernelDropdownMenuMorph extends KernelElement {
  private readonly contentId = `kernel-dropdown-menu-morph-${++menuMorphCounter}`;
  private readonly positioner = new FloatingPositioner();
  private open = false;
  private closeController: AbortController | null = null;
  private triggerEl: HTMLElement | null = null;
  private openFocus: ReturnType<typeof wireMenuOpenFocus> | null = null;

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
    (content as MenuClosable).__kernelMenuClose = (event) => this.close(itemReason(event), event);

    const { placement, align, offset } = readFloatingAttributes(this);
    content.setAttribute("data-placement", placement);
    content.setAttribute("data-align", align);

    const triggerEl = triggerSlot ? findTriggerElement(triggerSlot) : null;
    this.openFocus = wireMenuOpenFocus(triggerEl, content, {
      isOpen: () => this.open,
      open: () => {
        if (this.emitChange("beforetoggle", { open: true }, "trigger-press")) this.openMenu();
      },
    });

    if (triggerEl) {
      this.triggerEl = triggerEl;
      labelMenuByTrigger(content, triggerEl);
      triggerEl.setAttribute("aria-haspopup", "menu");
      triggerEl.setAttribute("aria-expanded", "false");
      this.positioner.attach(triggerEl, content, { placement, align, offset });
      triggerEl.addEventListener("click", (event) => {
        if (this.open) this.close("trigger-press", event);
        else if (this.emitChange("beforetoggle", { open: true }, "trigger-press", event)) this.openMenu();
      });
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
    content.setAttribute("data-open", "true");

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

    requestAnimationFrame(() => this.openFocus?.focusOnOpen());

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (!content.contains(target) && !trigger.contains(target)) this.close("outside-press", event, false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") this.close("escape-key", event);
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

  /** Focus goes back to the trigger first, as `popover="auto"` does for
   * `<kernel-dropdown-menu>` (a manual popover gets no such restore),
   * except after an outside press, which leaves focus where it put it. */
  private close(reason = "programmatic", event?: Event, returnFocus = true) {
    if (!this.open) return;
    const content = this.native;
    const trigger = this.triggerEl;
    if (!content || !trigger) return;
    if (!this.emitChange("beforetoggle", { open: false }, reason, event)) return;
    if (returnFocus) returnFocusFromMenu(content, trigger);

    this.open = false;
    this.openFocus?.resetIntent();
    this.triggerEl?.setAttribute("aria-expanded", "false");
    this.positioner.setOpen(false);
    content.removeAttribute("data-open");
    content.setAttribute("data-closing", "true");

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

    el.addEventListener("focus", () => el.setAttribute("data-highlighted", "true"));
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
      const popover = this.closest('[role="menu"], [popover]') as MenuClosable | null;
      // `__kernelMenuClose`, if the closest popover set one, replaces a
      // bare hidePopover() with whatever that popover's own close needs
      // to do first — `KernelDropdownMenuMorph` sets this so selecting
      // an item still plays the shrink-back-to-the-trigger animation
      // instead of the panel vanishing outright, and `KernelContextMenu`
      // sets it so a selection plays its exit and returns focus.
      // `KernelDropdownMenu`'s popover presentation never sets it: `popover="auto"` falls
      // through to the plain hidePopover(), which restores focus natively.
      if (popover?.__kernelMenuClose) popover.__kernelMenuClose(event);
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
        el.setAttribute("data-disabled", "true");
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
