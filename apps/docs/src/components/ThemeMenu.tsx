import { useEffect, useId, useRef, useState } from "react";
import { Button, mergeRefs, useFloatingPosition } from "@kernelui-lib/react";
import ThemeControls from "./ThemeControls";

/**
 * A sitewide accent + radius control, reachable from every page's
 * header — a native `popover` (the same primitive CommandPalette and
 * MobileHeaderNav already use) wrapping the shared ThemeControls.
 *
 * Positioning reuses the same `useFloatingPosition` hook DropdownMenu,
 * Combobox, Tooltip, and Popover already rely on — real CSS anchor
 * positioning tethered to the trigger, not a fixed viewport-edge inset
 * that only looks right by coincidence when the header happens to keep
 * a constant distance from that edge.
 */
export default function ThemeMenu() {
  const panelId = useId();
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLButtonElement, HTMLDivElement>({
    open,
    placement: "bottom",
  });

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;

    function handleToggle(event: Event) {
      setOpen((event as ToggleEvent).newState === "open");
    }

    node.addEventListener("toggle", handleToggle);
    return () => node.removeEventListener("toggle", handleToggle);
  }, []);

  return (
    <>
      <Button
        ref={anchorRef}
        type="button"
        variant="secondary"
        size="sm"
        className="theme-menu-trigger"
        popoverTarget={panelId}
        iconStart={<span className="theme-menu-swatch" aria-hidden="true" />}
      >
        Theme
      </Button>
      <div ref={mergeRefs(panelRef, floatingRef)} id={panelId} popover="auto" className="theme-menu-panel">
        <ThemeControls />
      </div>
    </>
  );
}
