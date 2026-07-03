import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@kernelui/react";
import { components } from "../data/components";
import { MagnifyingGlassIcon } from "./icons";

/** A fixed, hardcoded id rather than `useId()`: the mobile nav's own
 * search trigger (a plain button in a different island) needs to
 * point `popoverTarget` at this exact same DOM id, and two islands
 * can't share a React-generated one. */
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

/**
 * Native `popover`, same primitive as MobileHeaderNav and DropdownMenu:
 * top-layer stacking and light-dismiss (Escape, outside click) for
 * free. Every result is a real `<a href>` — Enter navigates the
 * browser natively, no client-side router to reimplement.
 */
export default function CommandPalette() {
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const results = useMemo(() => filterItems(query), [query]);

  useEffect(() => {
    function handleShortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        // Same shortcut closes it back up if it's already open, rather
        // than only ever opening — the expected toggle behaviour for
        // every command palette this one is modelled on.
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
      if ((event as ToggleEvent).newState === "open") {
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
      // Click the real <a> rather than assigning location.href, so Astro's
      // ClientRouter intercepts it as a soft navigation (persisted sidebar,
      // no full reload) — the same path a mouse click already takes.
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
        <kbd className="command-palette-kbd">⌘K</kbd>
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
          aria-expanded={results.length > 0}
          aria-controls={LISTBOX_ID}
          aria-autocomplete="list"
          aria-activedescendant={results[activeIndex] ? optionId(activeIndex) : undefined}
          className="command-palette-input"
          autoComplete="off"
        />
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
          {results.length === 0 && (
            <li className="command-palette-empty">No components match "{query}".</li>
          )}
        </ul>
      </div>
    </>
  );
}
