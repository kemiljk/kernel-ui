import { useLayoutEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, ReactNode } from "react";
import { MenuContext } from "../DropdownMenu/DropdownMenu";
import styles from "./ContextMenu.module.css";

const MARGIN = 8;

export interface ContextMenuProps {
  /** The area that opens the menu on right-click (or long-press). */
  render: ReactNode;
  children: ReactNode;
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
 */
export function ContextMenu({ render, children }: ContextMenuProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  function close() {
    setOpen(false);
    menuRef.current?.hidePopover();
  }

  function handleContextMenu(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    setPosition({ top: event.clientY, left: event.clientX });
    setOpen(true);
    menuRef.current?.showPopover();
  }

  // The panel is sized by its content, which isn't known until after it
  // has rendered and gained a real box, so the cursor position is
  // clamped against the viewport in a second pass here rather than at
  // the point the contextmenu event fires.
  useLayoutEffect(() => {
    if (!open) return;
    const node = menuRef.current;
    if (!node) return;

    const rect = node.getBoundingClientRect();
    const maxLeft = window.innerWidth - rect.width - MARGIN;
    const maxTop = window.innerHeight - rect.height - MARGIN;

    setPosition((current) => ({
      left: Math.max(MARGIN, Math.min(current.left, maxLeft)),
      top: Math.max(MARGIN, Math.min(current.top, maxTop)),
    }));
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
        popover="manual"
        className={styles.content}
        style={{ position: "fixed", top: position.top, left: position.left }}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}
