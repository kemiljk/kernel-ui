import { useLayoutEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent, MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { MenuContext, roveMenuItems } from "../DropdownMenu/DropdownMenu";
import { dataAttr } from "../../utils/polymorphic";
import { usePopoverExit } from "../../utils/usePopoverExit";
import styles from "./ContextMenu.module.css";

const MARGIN = 8;

/** Built-in strings, overridable for translation via `labels`. */
export interface ContextMenuLabels {
  /** The menu's accessible name when no `label` is given. Default: `"Context menu"`. */
  menu: string;
}

const defaultContextMenuLabels: ContextMenuLabels = {
  menu: "Context menu",
};

export interface ContextMenuProps {
  /** The area that opens the menu on right-click (or long-press). */
  render: ReactNode;
  /** The menu's content: `MenuItem`s and `MenuSeparator`s. */
  children: ReactNode;
  /** The menu's accessible name, e.g. `"File actions"`. A `role="menu"`
   * needs one, and unlike DropdownMenu there's no trigger button to take
   * it from. Falls back to `labels.menu` ("Context menu"). */
  label?: string;
  /** Overrides for built-in strings. */
  labels?: Partial<ContextMenuLabels>;
}

/**
 * Same `role="menu"` primitives as DropdownMenu, MenuItem and
 * MenuSeparator are imported straight from there, only the trigger and
 * positioning differ: this opens on the native `contextmenu` event
 * instead of a `popoverTarget` button, and is placed at the cursor
 * instead of anchored to an element, so `popover="manual"` plus a
 * manually-managed `showPopover()`/`hidePopover()` replaces the
 * declarative `popoverTarget` wiring, and outside-click/scroll dismissal
 * has to be wired up by hand the same way Combobox does for its own
 * `popover="manual"` listbox.
 *
 * The menu is named by `label` (falling back to `labels.menu`) rather
 * than `aria-labelledby`: the right-click area is arbitrary content,
 * often a whole row or canvas, so its text would make a poor name.
 */
export function ContextMenu({ render, children, label, labels }: ContextMenuProps) {
  const l = { ...defaultContextMenuLabels, ...labels };
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const { closing, playExit, cancelExit } = usePopoverExit(menuRef);

  /** `open` flips immediately so the dismissal listeners below tear
   * down at once; `playExit` only owns the fade, and hides the popover
   * once it has finished. Animating before the hide (rather than
   * relying on the closed state's CSS) is what keeps the panel from
   * being yanked out of the top layer mid-animation — see
   * `usePopoverExit`. */
  function close() {
    if (!open) return;
    setOpen(false);
    // Focus was moved into the menu on open; hand it back rather than
    // letting it fall to <body> when the popover hides.
    if (menuRef.current?.contains(document.activeElement)) returnFocusRef.current?.focus();
    void playExit();
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    cancelExit();
    setPosition({ top: event.clientY, left: event.clientX });
    setOpen(true);
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    menuRef.current?.showPopover();
    // APG menu: opening moves focus to the first item, so arrow keys work
    // straight away (a keyboard user opens this with Shift+F10 or the
    // context-menu key) — the same as DropdownMenu.
    requestAnimationFrame(() => {
      menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')?.focus();
    });
  }

  // The panel is sized by its content, which isn't known until after it
  // has rendered and gained a real box, so the cursor position is
  // clamped against the viewport in a second pass here rather than at
  // the point the contextmenu event fires. `rect.left`/`rect.top` at
  // this point are still the raw, pre-clamp cursor position (the inline
  // style was set to it directly), so this doubles as the one place
  // that knows both where the cursor actually clicked and where the
  // panel ended up — exactly what's needed to scale the panel in from
  // the cursor even when it's been nudged to stay on-screen.
  useLayoutEffect(() => {
    if (!open) return;
    const node = menuRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MARGIN;
    const maxTop = window.innerHeight - rect.height - MARGIN;
    const clampedLeft = Math.max(MARGIN, Math.min(rect.left, maxLeft));
    const clampedTop = Math.max(MARGIN, Math.min(rect.top, maxTop));

    const clamp = (value: number) => Math.max(0, Math.min(100, value));
    const originX = rect.width ? clamp(((rect.left - clampedLeft) / rect.width) * 100) : 50;
    const originY = rect.height ? clamp(((rect.top - clampedTop) / rect.height) * 100) : 50;
    node.style.setProperty("--kernel-transform-origin", `${originX}% ${originY}%`);

    setPosition({ left: clampedLeft, top: clampedTop });
  }, [open]);

  useLayoutEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) close();
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }
    function handleScroll() {
      close();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <MenuContext.Provider value={{ close }}>
      <div onContextMenu={handleContextMenu}>{render}</div>
      <div
        ref={menuRef}
        role="menu"
        aria-label={label || l.menu}
        popover="manual"
        data-open={dataAttr(open)}
        data-closing={dataAttr(closing)}
        className={styles.content}
        style={{ position: "fixed", top: position.top, left: position.left }}
        onKeyDown={(event: ReactKeyboardEvent<HTMLDivElement>) => roveMenuItems(menuRef.current, event)}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}
