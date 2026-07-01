import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs } from "../../utils/polymorphic";
import styles from "./CommandPalette.module.css";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyMessage?: ReactNode;
}

/**
 * A real `<dialog>`, opened with `showModal()`, the same reasoning as
 * `Dialog`: native top-layer stacking, a native focus trap, and native
 * Escape-to-close, none of it reimplemented in JavaScript. The filter
 * input inside follows the WAI-ARIA combobox pattern `Combobox` already
 * uses: a `role="listbox"` of `role="option"` items, an
 * `aria-activedescendant` pointing at whichever one is highlighted, and
 * focus staying on the input the whole time rather than moving into the
 * list, so a screen reader announces the active option without ever
 * leaving the text field.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = "Filter commands",
  emptyMessage = "No results",
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = items.filter((item) =>
    item.label.toLowerCase().includes(query.toLowerCase()),
  );

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    // Fires for every closing path: Escape, a backdrop click, or our
    // own `.close()` call above. Routing them all through here keeps
    // `onOpenChange` as the single source of truth, same as Dialog.
    const handleClose = () => onOpenChange(false);
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    // The dialog needs a frame to actually open before it can hold focus.
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function selectItem(item: CommandPaletteItem) {
    item.onSelect();
    onOpenChange(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const active = filtered[activeIndex];
        if (active) {
          event.preventDefault();
          selectItem(active);
        }
        break;
      }
      // Escape is left unhandled: the native <dialog> already closes
      // and fires `close` above, handling it here too would just
      // close it twice.
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.content}
      aria-label="Command palette"
      onClick={(event) => {
        if (event.target === dialogRef.current) onOpenChange(false);
      }}
    >
      <input
        ref={mergeRefs(inputRef)}
        type="text"
        role="combobox"
        aria-label={placeholder}
        aria-expanded="true"
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={filtered[activeIndex] ? `${listboxId}-option-${activeIndex}` : undefined}
        value={query}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(event) => {
          setQuery(event.target.value);
          setActiveIndex(0);
        }}
        onKeyDown={handleKeyDown}
        className={styles.input}
      />
      <div id={listboxId} role="listbox" className={styles.listbox}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>{emptyMessage}</div>
        ) : (
          filtered.map((item, index) => (
            <div
              key={item.id}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              data-active={dataAttr(index === activeIndex)}
              className={styles.option}
              onPointerDown={(event) => event.preventDefault()}
              onPointerMove={() => setActiveIndex(index)}
              onClick={() => selectItem(item)}
            >
              <div className={styles.optionLabel}>{item.label}</div>
              {item.description ? (
                <div className={styles.optionDescription}>{item.description}</div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </dialog>
  );
}
