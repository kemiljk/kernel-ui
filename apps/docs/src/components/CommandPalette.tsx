import { useEffect, useMemo, useState } from "react";
import { Button, CommandPalette as KernelCommandPalette } from "@kernelui-lib/react";
import type { CommandPaletteItem } from "@kernelui-lib/react";
import { components } from "../data/components";
import { MagnifyingGlassIcon } from "./icons";

/** Dispatched by the mobile header search button so the same palette
 * instance the desktop trigger owns can open without a shared popover id. */
export const OPEN_COMMAND_PALETTE_EVENT = "kernel:open-command-palette";

const pages = [
  { name: "Home", href: "/", summary: "The kernel of the web, componentised." },
  { name: "Components", href: "/components/", summary: "Every component, built and planned." },
  { name: "Platforms", href: "/platforms/", summary: "React, Web Components, and headless usage." },
  { name: "Installation", href: "/installation/", summary: "Install the packages and import the tokens." },
  { name: "Theming", href: "/theming/", summary: "Every token that drives a component's appearance." },
  { name: "CLI", href: "/cli/", summary: "Install and diagnose Kernel in a project." },
  { name: "Migration", href: "/migration/", summary: "Move an existing app onto Kernel." },
] as const;

function shortcutLabel() {
  if (typeof navigator === "undefined") return "⌘K";
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua) ? "⌘K" : "Ctrl+K";
}

/**
 * Sitewide search — wraps the shipped `@kernelui-lib/react` CommandPalette
 * (a real `<dialog>` with filter + listbox) rather than reimplementing the
 * same pattern with a hand-rolled `popover`. The trigger and ⌘K shortcut
 * stay site chrome; everything inside the panel is Kernel.
 */
export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [kbdLabel, setKbdLabel] = useState("⌘K");

  const items: CommandPaletteItem[] = useMemo(
    () => [
      ...pages.map((page) => ({
        id: page.href,
        label: page.name,
        description: page.summary,
        onSelect: () => {
          window.location.assign(page.href);
        },
      })),
      ...components
        .filter((component) => component.status === "available")
        .map((component) => ({
          id: component.slug,
          label: component.name,
          description: component.element,
          onSelect: () => {
            window.location.assign(`/components/${component.slug}/`);
          },
        })),
    ],
    [],
  );

  useEffect(() => {
    setKbdLabel(shortcutLabel());
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((current) => !current);
      }
    }
    function handleOpenRequest() {
      setOpen(true);
    }
    window.addEventListener("keydown", handleShortcut);
    window.addEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener("keydown", handleShortcut);
      window.removeEventListener(OPEN_COMMAND_PALETTE_EVENT, handleOpenRequest);
    };
  }, []);

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="command-palette-trigger"
        iconStart={<MagnifyingGlassIcon />}
        onClick={() => setOpen(true)}
      >
        Search
        <kbd className="command-palette-kbd">{kbdLabel}</kbd>
      </Button>
      <KernelCommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder="Search components…"
        emptyMessage="No components match."
        blur
      />
    </>
  );
}
