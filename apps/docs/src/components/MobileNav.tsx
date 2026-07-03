import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "@kernelui-lib/react";
import { CrossIcon, HamburgerMenuIcon } from "./icons";

interface MobileNavProps {
  children: ReactNode;
}

export default function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const dialogId = useId();

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
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
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => setOpen(true)}
      >
        <HamburgerMenuIcon width="16" height="16" />
        Docs menu
      </Button>
      <dialog
        id={dialogId}
        ref={dialogRef}
        {...{ closedby: "any" }}
        aria-labelledby={titleId}
        className="mobile-nav-panel"
        onClick={(event) => {
          const target = event.target as HTMLElement;
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
            Docs menu
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
