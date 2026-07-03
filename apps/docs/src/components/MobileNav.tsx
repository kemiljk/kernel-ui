import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@kernelui/react";
import { CrossIcon, HamburgerMenuIcon } from "./icons";

interface MobileNavProps {
  /** The same `<DocsSidebarNav />` markup the desktop sidebar renders,
   * passed through from BaseLayout as static Astro-rendered children —
   * see the comment on DocsSidebarNav.astro for why this is the one
   * shared source instead of a second, flat-list copy of the nav. */
  children: ReactNode;
}

/**
 * Below 900px, `.docs-sidebar-slot` (the real Sidebar) is hidden by CSS
 * rather than left to stack above the content the way `.docs-shell`'s
 * grid collapse alone would leave it: a ~30-link vertical nav sitting
 * above the page pushes whatever the visitor actually came to look at
 * off the first screen. This is the mobile replacement: a single
 * trigger that opens the same links in a left-anchored slide-in panel —
 * a real `<dialog>` for the same native focus-trap/Escape/backdrop
 * benefits `Dialog` gets, just positioned and animated as a drawer
 * instead of a centered, scaled-in sheet (a centered modal reads as
 * "confirm this", a slide-in from the edge reads as "here's your nav",
 * which is what this actually is).
 */
export default function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    // Fires for every closing path: Escape, backdrop click, or our own
    // `.close()` call above — routing them all through here keeps
    // `open` state as the single source of truth.
    const handleClose = () => setOpen(false);
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mobile-nav-trigger"
        onClick={() => setOpen(true)}
      >
        <HamburgerMenuIcon width="16" height="16" />
        Menu
      </Button>
      <dialog
        ref={dialogRef}
        {...{ closedby: "any" }}
        aria-labelledby={titleId}
        className="mobile-nav-panel"
        onClick={(event) => {
          const target = event.target as HTMLElement;
          // Backdrop click, or a click on any nav link the shared markup
          // below rendered — either way, the drawer's job is done.
          if (target === dialogRef.current || target.closest("a[href]")) {
            setOpen(false);
          }
        }}
        onCancel={(event) => {
          event.stopPropagation();
        }}
      >
        <div className="mobile-nav-panel-header">
          <span id={titleId} className="mobile-nav-panel-title">
            Menu
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            aria-label="Close"
            onClick={() => setOpen(false)}
          >
            <CrossIcon width="16" height="16" />
          </Button>
        </div>
        {children}
      </dialog>
    </>
  );
}
