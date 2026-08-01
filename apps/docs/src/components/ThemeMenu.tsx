import { Button, Popover } from "@kernelui-lib/react";
import ThemeControls from "./ThemeControls";

/**
 * A sitewide accent + radius control, reachable from every page's
 * header — Kernel's `Popover` (the same primitive the component docs
 * demonstrate) wrapping the shared ThemeControls. Positioning, light
 * dismiss, and open/close animation all come from the package; this
 * file only supplies the trigger chrome and the controls inside.
 */
export default function ThemeMenu() {
  return (
    <Popover
      placement="bottom"
      className="theme-menu-panel"
      render={
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="theme-menu-trigger"
          iconStart={<span className="theme-menu-swatch" aria-hidden="true" />}
        >
          Theme
        </Button>
      }
    >
      <ThemeControls />
    </Popover>
  );
}
