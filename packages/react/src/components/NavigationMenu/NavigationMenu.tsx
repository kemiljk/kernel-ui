import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode, RefObject } from "react";
import { mergeRefs } from "../../utils/polymorphic";
import { useFloatingPosition } from "../../utils/useFloatingPosition";
import styles from "./NavigationMenu.module.css";

interface NavigationMenuItemContextValue {
  contentId: string;
  open: boolean;
  anchorRef: RefObject<HTMLButtonElement | null>;
  floatingRef: RefObject<HTMLDivElement | null>;
}

const NavigationMenuItemContext = createContext<NavigationMenuItemContextValue | null>(null);

export interface NavigationMenuProps {
  children: ReactNode;
  /** Required: a page can have more than one navigation menu, so each
   * needs its own accessible name. */
  "aria-label": string;
}

/** A real `<nav>` landmark wrapping a real `<ul>`, same semantic base as
 * `Nav`. Each top-level entry is a `NavigationMenuItem`, either a plain
 * link or a trigger that opens a mega-menu panel. */
export function NavigationMenu({ children, "aria-label": ariaLabel }: NavigationMenuProps) {
  return (
    <nav aria-label={ariaLabel} className={styles.root}>
      <ul className={styles.list}>{children}</ul>
    </nav>
  );
}

/**
 * Wraps one top-level entry and provides the shared popover id/open-state
 * so `NavigationMenuTrigger` and `NavigationMenuContent` inside it can
 * coordinate without prop drilling, same `*Context` pattern as
 * `DropdownMenu`'s `MenuContext`. `useFloatingPosition` is called here
 * (once per item that has a panel) rather than inside the trigger or
 * content themselves, since both need the same pair of refs.
 */
export function NavigationMenuItem({ children }: { children: ReactNode }) {
  const contentId = useId();
  const [open, setOpen] = useState(false);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLButtonElement, HTMLDivElement>({
    open,
  });
  const floatingNode = floatingRef.current;

  useEffect(() => {
    if (!floatingNode) return;

    function handleToggle(event: Event) {
      setOpen((event as ToggleEvent).newState === "open");
    }

    floatingNode.addEventListener("toggle", handleToggle);
    return () => floatingNode.removeEventListener("toggle", handleToggle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [floatingNode]);

  return (
    <NavigationMenuItemContext.Provider value={{ contentId, open, anchorRef, floatingRef }}>
      <li className={styles.item}>{children}</li>
    </NavigationMenuItemContext.Provider>
  );
}

export interface NavigationMenuLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  href: string;
  children: ReactNode;
}

/** A plain link, for items with no submenu. */
export function NavigationMenuLink({ children, ...rest }: NavigationMenuLinkProps) {
  return (
    <a {...rest} className={styles.link}>
      {children}
    </a>
  );
}

export interface NavigationMenuTriggerProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "popoverTarget"> {
  children: ReactNode;
}

/**
 * The clickable label for an item with a submenu. Opens its sibling
 * `NavigationMenuContent` via `popoverTarget`, the same native
 * `popover="auto"` + toggle-event mechanism `DropdownMenu` uses, click-based
 * rather than hover-only so the panel behaves the same on touch devices.
 */
export function NavigationMenuTrigger({ children, ...rest }: NavigationMenuTriggerProps) {
  const context = useContext(NavigationMenuItemContext);
  if (!context) {
    throw new Error("NavigationMenuTrigger must be used inside a NavigationMenuItem");
  }
  const { contentId, open, anchorRef } = context;

  return (
    <button
      {...rest}
      ref={anchorRef}
      type="button"
      popoverTarget={contentId}
      aria-haspopup="true"
      aria-expanded={open}
      className={styles.trigger}
    >
      {children}
      <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}

export interface NavigationMenuContentProps {
  children: ReactNode;
}

/** The mega-menu panel for an item, arbitrary content, shown and hidden
 * via the same popover mechanism `DropdownMenu`'s `.content` uses. */
export function NavigationMenuContent({ children }: NavigationMenuContentProps) {
  const context = useContext(NavigationMenuItemContext);
  if (!context) {
    throw new Error("NavigationMenuContent must be used inside a NavigationMenuItem");
  }
  const { contentId, floatingRef } = context;

  return (
    <div
      ref={mergeRefs(floatingRef)}
      id={contentId}
      popover="auto"
      className={styles.content}
    >
      {children}
    </div>
  );
}
