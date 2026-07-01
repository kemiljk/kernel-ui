import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type { ButtonHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs, renderElement, type RenderProp } from "../../utils/polymorphic";
import { useFloatingPosition, type FloatingPlacement } from "../../utils/useFloatingPosition";
import styles from "./DropdownMenu.module.css";

interface MenuContextValue {
  close: () => void;
}

/** Exported so other menu-shaped triggers (ContextMenu) can share
 * MenuItem/MenuSeparator without duplicating them. */
export const MenuContext = createContext<MenuContextValue | null>(null);

export interface DropdownMenuProps {
  render: RenderProp<{ open: boolean }>;
  children: ReactNode;
  placement?: FloatingPlacement;
}

/**
 * `role="menu"` on a `popover="auto"` element: outside-click and Escape
 * dismissal, and top-layer stacking, are native to the popover, arrow-key
 * roving between items is the one part of the WAI-ARIA menu pattern that
 * has to be wired up by hand, there's no native menu element.
 */
export function DropdownMenu({ render, children, placement = "bottom" }: DropdownMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
  });

  useEffect(() => {
    const node = menuRef.current;
    if (!node) return;

    function handleToggle(event: Event) {
      const nowOpen = (event as ToggleEvent).newState === "open";
      setOpen(nowOpen);
      if (nowOpen) {
        requestAnimationFrame(() => {
          menuRef.current
            ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
            ?.focus();
        });
      }
    }

    node.addEventListener("toggle", handleToggle);
    return () => node.removeEventListener("toggle", handleToggle);
  }, []);

  function close() {
    menuRef.current?.hidePopover();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])') ?? [],
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

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      popoverTarget: id,
      "aria-haspopup": "menu",
      "aria-expanded": open,
    },
    { open },
  );

  return (
    <MenuContext.Provider value={{ close }}>
      {trigger}
      <div
        ref={mergeRefs(menuRef, floatingRef)}
        id={id}
        role="menu"
        popover="auto"
        onKeyDown={handleKeyDown}
        className={styles.content}
      >
        {children}
      </div>
    </MenuContext.Provider>
  );
}

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "role"> {
  destructive?: boolean;
  onSelect?: () => void;
}

export function MenuItem({ destructive = false, onSelect, onClick, disabled, children, ...rest }: MenuItemProps) {
  const context = useContext(MenuContext);

  return (
    <button
      {...rest}
      type="button"
      role="menuitem"
      tabIndex={-1}
      disabled={disabled}
      aria-disabled={disabled || undefined}
      data-destructive={dataAttr(destructive)}
      className={styles.item}
      onClick={(event) => {
        onClick?.(event);
        onSelect?.();
        context?.close();
      }}
    >
      {children}
    </button>
  );
}

export function MenuSeparator() {
  return <div role="separator" className={styles.separator} />;
}
