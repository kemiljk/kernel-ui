import { useId } from "react";
import { Button, Nav, NavLink } from "@kernelui-lib/react";
import ThemeToggle from "./ThemeToggle";
import ThemeControls from "./ThemeControls";
import { COMMAND_PALETTE_ID } from "./CommandPalette";
import { HamburgerMenuIcon, MagnifyingGlassIcon } from "./icons";
import { GITHUB_URL } from "../lib/site";
import { formatStarCount } from "../lib/formatStarCount";

interface MobileHeaderNavProps {
  items: { href: string; label: string }[];
  currentPath: string;
  starCount: number | null;
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" width="16" height="16">
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
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
export default function MobileHeaderNav({ items, currentPath, starCount }: MobileHeaderNavProps) {
  const panelId = useId();
  const githubLabel =
    starCount != null
      ? `GitHub repository (${formatStarCount(starCount)} stars)`
      : "GitHub repository";

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
        <HamburgerMenuIcon width="16" height="16" />
      </Button>
      <div id={panelId} popover="auto" className="mobile-header-nav-panel">
        <a
          href={GITHUB_URL}
          className="mobile-header-nav-github"
          target="_blank"
          rel="noopener noreferrer"
          aria-label={githubLabel}
        >
          <GitHubIcon />
          <span>GitHub</span>
          {starCount != null ? (
            <span className="site-header-github-stars" aria-hidden="true">
              {formatStarCount(starCount)}
            </span>
          ) : null}
        </a>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mobile-header-nav-search"
          popoverTarget={COMMAND_PALETTE_ID}
          iconStart={<MagnifyingGlassIcon />}
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
