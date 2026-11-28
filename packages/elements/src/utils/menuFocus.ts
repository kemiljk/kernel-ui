/**
 * Focus and highlight for a `role="menu"` of `role="menuitem"`s, shared by
 * DropdownMenu (all three presentations) and ContextMenu. Framework-free on
 * purpose: `packages/react/src/utils/menuFocus.ts` and
 * `packages/elements/src/utils/menuFocus.ts` are the same file, so both
 * packages open, rove and highlight the same way. Change them together.
 *
 * The WAI-ARIA menu button pattern moves focus to the first item when the
 * menu opens from the keyboard (the last item for ArrowUp). A pointer open
 * is different: nothing is highlighted until the pointer reaches an item
 * or a key is pressed, the way native menus and Radix behave. So the menu
 * container takes focus instead (it carries `tabindex="-1"`), and the first
 * arrow key from there lands on the first or last item.
 *
 * The highlight then follows the pointer by moving real focus, so there is
 * only ever one highlighted row (focus is `data-highlighted`). The menu's
 * `data-input` records which input moved focus last; CSS uses it to keep
 * `:focus-visible` rings to keyboard focus only.
 */

/** Where focus lands when a menu opens. */
export type MenuOpenFocus = "pointer" | "first" | "last";

/** Enabled items, in DOM order. */
const ENABLED_ITEM = '[role="menuitem"]:not([aria-disabled="true"]):not(:disabled)';

/** Structural subsets of the DOM and React events these helpers read, so
 * React's synthetic events and native ones can both be passed. */
interface KeyLike {
  key: string;
  preventDefault(): void;
}
interface PointerLike {
  target: EventTarget | null;
  pointerType: string;
}

function setInput(menu: HTMLElement, input: "pointer" | "keyboard") {
  if (menu.getAttribute("data-input") !== input) menu.setAttribute("data-input", input);
}

function enabledItems(menu: HTMLElement): HTMLElement[] {
  return Array.from(menu.querySelectorAll<HTMLElement>(ENABLED_ITEM));
}

/** The open intent a key on the trigger asks for, or `null` for keys that
 * don't open the menu. Enter/Space open through the trigger's own click;
 * ArrowDown/ArrowUp have to open the menu by hand. */
export function menuTriggerKeyIntent(key: string): MenuOpenFocus | null {
  if (key === "ArrowUp") return "last";
  if (key === "ArrowDown" || key === "Enter" || key === " ") return "first";
  return null;
}

/** Moves focus into a menu that has just opened. */
export function focusMenuOnOpen(menu: HTMLElement, intent: MenuOpenFocus) {
  if (intent === "pointer") {
    setInput(menu, "pointer");
    menu.focus({ preventScroll: true });
    return;
  }
  setInput(menu, "keyboard");
  const items = enabledItems(menu);
  const target = intent === "last" ? items[items.length - 1] : items[0];
  (target ?? menu).focus();
}

/** Arrow keys, Home and End between enabled items. From the container
 * (nothing highlighted yet), ArrowDown goes to the first item and ArrowUp
 * to the last. */
export function roveMenuItems(menu: HTMLElement | null, event: KeyLike) {
  if (!menu) return;
  const items = enabledItems(menu);
  if (items.length === 0) return;
  const currentIndex = items.indexOf(document.activeElement as HTMLElement);
  let nextIndex: number;

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
  setInput(menu, "keyboard");
  items[nextIndex]?.focus();
}

/** `pointermove` on the menu: focus the enabled item under the pointer, so
 * the highlight follows it. Over a disabled item the highlight clears. Touch
 * is ignored, because a finger only moves while scrolling the menu. */
export function highlightMenuItemUnderPointer(menu: HTMLElement | null, event: PointerLike) {
  if (!menu || event.pointerType === "touch") return;
  const item = (event.target as Element | null)?.closest?.<HTMLElement>('[role="menuitem"]');
  if (!item || !menu.contains(item)) return;
  setInput(menu, "pointer");
  if (!item.matches(ENABLED_ITEM)) {
    clearItemFocus(menu);
    return;
  }
  if (document.activeElement !== item) item.focus({ preventScroll: true });
}

/** `pointerleave` on the menu: a highlight the pointer put there goes with
 * it. One the keyboard put there stays, so leaving the menu with the mouse
 * never loses a keyboard user's place. */
export function clearMenuPointerHighlight(menu: HTMLElement | null) {
  if (!menu || menu.getAttribute("data-input") !== "pointer") return;
  clearItemFocus(menu);
}

function clearItemFocus(menu: HTMLElement) {
  const active = document.activeElement;
  if (active !== menu && menu.contains(active)) menu.focus({ preventScroll: true });
}

/** Elements that take focus without help. Approximate on purpose: it only
 * decides whether a context menu's fallback target needs `tabindex="-1"`. */
const FOCUSABLE =
  'a[href], button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), summary, [tabindex], [contenteditable]:not([contenteditable="false"])';

/**
 * Where a context menu sends focus back when it closes, read as it opens:
 * whatever had focus (`focusedBefore`), else the right-clicked element (or
 * its nearest focusable ancestor inside the trigger region), else the
 * region itself.
 *
 * Pass the element that had focus at `pointerdown` for a pointer open: the
 * press itself moves focus (to the body, over plain content) before the
 * `contextmenu` event fires, so `document.activeElement` is already wrong
 * by then. A keyboard open has no press, so it reads the live focus.
 */
export function contextMenuReturnTarget(
  region: HTMLElement,
  target: EventTarget | null,
  focusedBefore: Element | null,
): HTMLElement {
  if (focusedBefore instanceof HTMLElement && focusedBefore !== document.body && focusedBefore.isConnected) {
    return focusedBefore;
  }
  const clicked = (target as Element | null)?.closest?.<HTMLElement>(FOCUSABLE);
  if (clicked && region.contains(clicked)) return clicked;
  return region;
}

/**
 * Returns focus to `target` as a menu closes, the way a native menu does
 * after Escape or a selection. Only while focus is still in the menu, or
 * has fallen to the body: focus the user has already put somewhere else
 * stays there. Call it before the panel hides, so focus never sits in a
 * closing menu. A target that can't take focus (a context menu's plain
 * trigger region) gets `tabindex="-1"` first.
 */
export function returnFocusFromMenu(menu: HTMLElement | null, target: HTMLElement | null) {
  if (!menu || !target?.isConnected) return;
  const active = document.activeElement;
  if (active && active !== document.body && !menu.contains(active)) return;
  if (!target.matches(FOCUSABLE)) target.tabIndex = -1;
  target.focus({ preventScroll: true });
}
