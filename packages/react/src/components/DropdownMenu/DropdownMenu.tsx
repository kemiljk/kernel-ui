import {
  createContext,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";
import type {
  ButtonHTMLAttributes,
  FocusEvent as ReactFocusEvent,
  KeyboardEvent,
  MouseEvent as ReactMouseEvent,
  ReactNode,
} from "react";
import {
  dataAttr,
  mergeRefs,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import styles from "./DropdownMenu.module.css";

interface MenuContextValue {
  close: () => void;
}

/** Exported so other menu-shaped triggers (ContextMenu) can share
 * MenuItem/MenuSeparator without duplicating them. */
export const MenuContext = createContext<MenuContextValue | null>(null);

export interface DropdownMenuState {
  open: boolean;
  placement: FloatingPlacement;
  align: FloatingAlign;
}

export interface DropdownMenuProps {
  render: RenderProp<{ open: boolean }>;
  children: ReactNode;
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the trigger. */
  align?: FloatingAlign;
  /** Gap between the trigger and the menu, in pixels. */
  offset?: number;
  /** Classes for the menu popup. */
  className?: ClassNameValue<DropdownMenuState>;
  /** Replace the popup element (e.g. wrap with Motion). */
  renderContent?: RenderProp<DropdownMenuState>;
}

/**
 * `role="menu"` on a `popover="auto"` element: outside-click and Escape
 * dismissal, and top-layer stacking, are native to the popover, arrow-key
 * roving between items is the one part of the WAI-ARIA menu pattern that
 * has to be wired up by hand, there's no native menu element.
 */
export function DropdownMenu({
  render,
  children,
  placement = "bottom",
  align = "center",
  offset = 8,
  className,
  renderContent,
}: DropdownMenuProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const state: DropdownMenuState = { open, placement, align };

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
    menuRef.current?.hidePopover?.();
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

  const popupProps: Record<string, unknown> = {
    ref: mergeRefs(menuRef, floatingRef),
    id,
    role: "menu",
    popover: "auto",
    onKeyDown: handleKeyDown,
    "data-slot": "dropdown-menu-content",
    "data-placement": placement,
    "data-align": align,
    "data-open": dataAttr(open),
    className: [styles.content, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" "),
    children,
  };

  const popup = renderElement(renderContent, "div", popupProps, state);

  return (
    <MenuContext.Provider value={{ close }}>
      {trigger}
      {popup}
    </MenuContext.Provider>
  );
}

export interface MenuItemState {
  disabled: boolean;
  destructive: boolean;
  highlighted: boolean;
}

export interface MenuItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "role"> {
  destructive?: boolean;
  onSelect?: () => void;
  className?: ClassNameValue<MenuItemState>;
  /** Render as a different element — typically an `<a>`, React Router
   * `Link`, or Next.js `Link` — while keeping menu keyboard behaviour. */
  render?: RenderProp<MenuItemState>;
}

export function MenuItem({
  destructive = false,
  onSelect,
  onClick,
  onKeyDown,
  onFocus,
  onBlur,
  disabled,
  children,
  className,
  render,
  ...rest
}: MenuItemProps) {
  const context = useContext(MenuContext);
  const [highlighted, setHighlighted] = useState(false);
  const state: MenuItemState = {
    disabled: Boolean(disabled),
    destructive,
    highlighted,
  };

  function handleClick(event: ReactMouseEvent<HTMLElement>) {
    onClick?.(event as ReactMouseEvent<HTMLButtonElement>);
    if (event.defaultPrevented || disabled) return;
    // Modifier-clicks / middle-click keep native link behaviour (new tab,
    // etc.) — we never preventDefault here, only close after select.
    onSelect?.();
    context?.close();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    onKeyDown?.(event as KeyboardEvent<HTMLButtonElement>);
    if (event.defaultPrevented || disabled) return;
    // Anchors activate on Enter natively; Space does not. Mirror button
    // menu-item behaviour so keyboard users get a consistent activation.
    if (event.key === " ") {
      event.preventDefault();
      (event.currentTarget as HTMLElement).click();
    }
  }

  const sharedProps: Record<string, unknown> = {
    ...rest,
    role: "menuitem",
    tabIndex: -1,
    "aria-disabled": disabled || undefined,
    "data-slot": "menu-item",
    "data-highlighted": dataAttr(highlighted),
    "data-disabled": dataAttr(disabled),
    "data-destructive": dataAttr(destructive),
    className: [styles.item, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" "),
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    onFocus: (event: ReactFocusEvent<HTMLElement>) => {
      setHighlighted(true);
      onFocus?.(event as ReactFocusEvent<HTMLButtonElement>);
    },
    onBlur: (event: ReactFocusEvent<HTMLElement>) => {
      setHighlighted(false);
      onBlur?.(event as ReactFocusEvent<HTMLButtonElement>);
    },
    children,
  };

  if (render) {
    return renderElement(
      render,
      "button",
      {
        ...sharedProps,
        // Non-button renders can't take the boolean `disabled` attribute
        // meaningfully — aria-disabled above covers assistive tech.
      },
      state,
    );
  }

  return (
    <button
      {...(sharedProps as ButtonHTMLAttributes<HTMLButtonElement>)}
      type="button"
      disabled={disabled}
    />
  );
}

export function MenuSeparator() {
  return <div role="separator" data-slot="menu-separator" className={styles.separator} />;
}

/**
 * The same down chevron `NavigationMenuTrigger` bakes in automatically —
 * exported here instead, since `DropdownMenu`'s trigger is an arbitrary
 * `render` element rather than a dedicated trigger component, so there's
 * no single place to inject it silently (see `RenderProp`'s doc comment:
 * what renders is always visible at the call site, not implied). Drop it
 * in as a trigger's `iconEnd` (or any child) — it reads `aria-expanded`
 * off its nearest ancestor via CSS, so it rotates open/closed on its own
 * with no extra wiring, the same as `NavigationMenuTrigger`'s.
 */
export function MenuChevron() {
  return (
    <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 6L8 10L12 6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
