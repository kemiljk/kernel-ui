import { useState } from "react";
import type { ReactNode } from "react";
import { Button, Dialog } from "@kernelui-lib/react";
import { HamburgerMenuIcon } from "./icons";

interface MobileNavProps {
  children: ReactNode;
}

/**
 * Docs-sidebar drawer on narrow viewports. Kernel's `Dialog` supplies
 * the real `<dialog>`, focus trap, Escape, and exit-aware close; site
 * CSS (`.mobile-nav-panel`) restyles it into a left-edge sheet rather
 * than the default centred card.
 */
export default function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="mobile-nav-trigger"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <HamburgerMenuIcon width="16" height="16" />
        Docs menu
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Docs menu"
        classNames={{ root: "mobile-nav-panel" }}
        closeOnBackdropClick
      >
        <div
          onClick={(event) => {
            if ((event.target as HTMLElement).closest("a[href]")) {
              setOpen(false);
            }
          }}
        >
          {children}
        </div>
      </Dialog>
    </>
  );
}
