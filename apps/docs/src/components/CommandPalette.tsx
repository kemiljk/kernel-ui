import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@kernelui-lib/react";
import { components } from "../data/components";
import { MagnifyingGlassIcon } from "./icons";

export const COMMAND_PALETTE_ID = "kernel-command-palette";

const LISTBOX_ID = `${COMMAND_PALETTE_ID}-listbox`;
const optionId = (index: number) => `${COMMAND_PALETTE_ID}-option-${index}`;

interface PaletteItem {
  name: string;
  href: string;
  summary: string;
}

const pages: PaletteItem[] = [
  { name: "Home", href: "/", summary: "The kernel of the web, componentised." },
  { name: "Components", href: "/components/", summary: "Every component, built and planned." },
  { name: "Platforms", href: "/platforms/", summary: "React, Web Components, and headless usage." },
  { name: "Installation", href: "/installation/", summary: "Install the packages and import the tokens." },
  { name: "Theming", href: "/theming/", summary: "Every token that drives a component's appearance." },
];

const items: PaletteItem[] = [
  ...pages,
  ...components
    .filter((component) => component.status === "available")
    .map((component) => ({
      name: component.name,
      href: `/components/${component.slug}/`,
      summary: component.element,
    })),
];

function filterItems(query: string): PaletteItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.summary.toLowerCase().includes(q),
  );
}

function shortcutLabel() {
  if (typeof navigator === "undefined") return "⌘K";
  const ua = navigator.userAgent;
  return /Mac|iPhone|iPad|iPod/.test(ua) ? "⌘K" : "Ctrl+K";
}

export default function CommandPalette() {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [open, setOpen] = useState(false);
  const [kbdLabel, setKbdLabel] = useState("⌘K");

  const results = useMemo(() => filterItems(query), [query]);

  useEffect(() => {
    setKbdLabel(shortcutLabel());
  }, []);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        panelRef.current?.togglePopover();
      }
    }
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  useEffect(() => {
    const node = panelRef.current;
    if (!node) return;
    function handleToggle(event: Event) {
      const toggleEvent = event as ToggleEvent;
      const isOpen = toggleEvent.newState === "open";
      setOpen(isOpen);
      if (isOpen) {
        setQuery("");
        setActiveIndex(0);
        requestAnimationFrame(() => inputRef.current?.focus());
      }
    }
    node.addEventListener("toggle", handleToggle);
    return () => node.removeEventListener("toggle", handleToggle);
  }, []);

  function handleInputKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (event.key === "Enter") {
      const item = results[activeIndex];
      if (!item) return;
      const link = panelRef.current?.querySelector<HTMLAnchorElement>(
        `#${CSS.escape(optionId(activeIndex))}`,
      );
      if (link) link.click();
      else window.location.href = item.href;
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="command-palette-trigger"
        popoverTarget={COMMAND_PALETTE_ID}
        iconStart={<MagnifyingGlassIcon />}
      >
        Search
        <kbd className="command-palette-kbd">{kbdLabel}</kbd>
      </Button>
      <div id={COMMAND_PALETTE_ID} popover="auto" ref={panelRef} className="command-palette">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActiveIndex(0);
          }}
          onKeyDown={handleInputKeyDown}
          placeholder="Search components…"
          aria-label="Search components"
          role="combobox"
          aria-expanded={open}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
          className="command-palette-input"
          autoComplete="off"
        />
        <div className="command-palette-status" aria-live="polite" aria-atomic="true">
          {results.length === 0 && query ? `No components match "${query}".` : ""}
        </div>
        <ul id={LISTBOX_ID} className="command-palette-list" role="listbox">
          {results.map((item, index) => (
            <li key={item.href} role="presentation">
              <a
                href={item.href}
                id={optionId(index)}
                role="option"
                aria-selected={index === activeIndex}
                className="command-palette-item"
                data-active={index === activeIndex || undefined}
              >
                <span className="command-palette-item-name">{item.name}</span>
                <span className="command-palette-item-summary">{item.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
