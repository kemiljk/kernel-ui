import { useId } from "react";
import { Button, Nav, NavLink } from "@kernelui/react";
import ThemeToggle from "./ThemeToggle";
import ThemeControls from "./ThemeControls";
import { COMMAND_PALETTE_ID } from "./CommandPalette";

interface MobileHeaderNavProps {
  items: { href: string; label: string }[];
  currentPath: string;
}

/**
 * Below `--site-header-collapse` (see global.css), the header's inline
 * Nav and ThemeToggle are hidden and replaced by this. It's a native
 * `popover`, not a `<dialog>`: a page-level nav menu is a disclosure
 * anchored to its trigger, not a task that needs to block the rest of
 * the page behind a modal scrim. `popover="auto"` gets top-layer
 * stacking, light-dismiss (outside click, Escape), and open/close via
 * `popoverTarget` for free, no JavaScript at all.
 */
export default function MobileHeaderNav({ items, currentPath }: MobileHeaderNavProps) {
  const panelId = useId();

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mobile-header-nav-trigger"
        aria-label="Menu"
        popoverTarget={panelId}
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16" fill="none">
          <path
            d="M2 4h12M2 8h12M2 12h12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </Button>
      <div id={panelId} popover="auto" className="mobile-header-nav-panel">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mobile-header-nav-search"
          popoverTarget={COMMAND_PALETTE_ID}
          iconStart={
            <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M11 11L14 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          }
        >
          Search components
        </Button>
        <Nav aria-label="Primary">
          {items.map((item) => (
            <NavLink
              key={item.href}
              href={item.href}
              aria-current={currentPath === item.href ? "page" : undefined}
            >
              {item.label}
            </NavLink>
          ))}
        </Nav>
        <div className="mobile-header-nav-theme">
          <ThemeControls />
        </div>
        <div className="mobile-header-nav-toggle">
          <span>Colour scheme</span>
          <ThemeToggle />
        </div>
      </div>
    </>
  );
}
