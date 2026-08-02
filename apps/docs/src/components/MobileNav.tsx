import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { navigate } from "astro:transitions/client";
import { Button, Dialog } from "@kernelui-lib/react";
import { HamburgerMenuIcon } from "./icons";

interface MobileNavProps {
  children: ReactNode;
}

function parseCssMs(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith("ms")) return parseFloat(trimmed) || 0;
  return (parseFloat(trimmed) || 0) * 1000;
}

function waitForDialogExit(node: HTMLDialogElement, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();

  const exitMs =
    parseCssMs(getComputedStyle(node).getPropertyValue("--kernel-duration-exit")) || 150;
  const timeoutMs = exitMs + 50;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      node.removeEventListener("transitionend", onEnd);
      clearTimeout(timer);
      signal.removeEventListener("abort", finish);
      resolve();
    };

    const onEnd = (event: TransitionEvent) => {
      if (event.target === node) finish();
    };

    const timer = window.setTimeout(finish, timeoutMs);
    node.addEventListener("transitionend", onEnd);
    signal.addEventListener("abort", finish);
  });
}

/**
 * Docs-sidebar drawer on narrow viewports. Kernel's `Dialog` supplies
 * the real `<dialog>`, focus trap, Escape, and exit-aware close, plus
 * the left-edge sheet layout and slide-in motion via `side="left"`;
 * site CSS (`.mobile-nav-panel`) only trims the sheet to the sidebar's
 * own width.
 *
 * In-app nav links defer `navigate()` until the sheet's exit transition
 * finishes. Closing and navigating in the same click used to race
 * ClientRouter's DOM swap against Dialog's exit animation — the
 * component unmounted mid-close, the transition aborted, and the sheet
 * read as closing twice.
 */
export default function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pendingHrefRef = useRef<string | null>(null);
  const navAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (open || !pendingHrefRef.current) return;

    const href = pendingHrefRef.current;
    const node = dialogRef.current;
    navAbortRef.current?.abort();
    const controller = new AbortController();
    navAbortRef.current = controller;

    void (async () => {
      if (node) await waitForDialogExit(node, controller.signal);
      if (controller.signal.aborted) return;
      pendingHrefRef.current = null;
      await navigate(href);
    })();

    return () => controller.abort();
  }, [open]);

  useEffect(() => () => navAbortRef.current?.abort(), []);

  function handleContentClick(event: MouseEvent<HTMLDivElement>) {
    const link = (event.target as HTMLElement).closest("a[href]");
    if (!link || !open) return;
    const anchor = link as HTMLAnchorElement;

    const rawHref = anchor.getAttribute("href");
    if (!rawHref || rawHref.startsWith("#")) return;
    if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;

    const url = new URL(anchor.href, window.location.href);
    if (url.origin !== window.location.origin) return;

    event.preventDefault();

    const destination = url.pathname + url.search + url.hash;
    const here =
      window.location.pathname + window.location.search + window.location.hash;
    if (destination === here) {
      setOpen(false);
      return;
    }

    pendingHrefRef.current = destination;
    setOpen(false);
  }

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
        ref={dialogRef}
        open={open}
        onOpenChange={setOpen}
        title="Docs menu"
        side="left"
        classNames={{ root: "mobile-nav-panel" }}
        closeOnBackdropClick
      >
        <div onClick={handleContentClick}>{children}</div>
      </Dialog>
    </>
  );
}
