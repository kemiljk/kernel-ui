import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs } from "../../utils/polymorphic";
import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
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
  /** Light frost on the `::backdrop` (`backdrop-filter: blur(8px)`). */
  blur?: boolean;
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
 *
 * Enter/exit motion (opacity + slight scale + settle) is the default —
 * Escape and backdrop dismiss are held via `cancel`/`data-closing` until
 * the exit transition finishes, matching `Dialog`, so the close doesn't
 * snap shut underneath the animation.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = "Filter commands",
  emptyMessage = "No results",
  blur = false,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exitAbortRef = useRef<AbortController | null>(null);
  const skipCloseSyncRef = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = items.filter((item) => {
    const q = query.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      (item.description?.toLowerCase().includes(q) ?? false)
    );
  });

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;

    if (open) {
      exitAbortRef.current?.abort();
      exitAbortRef.current = null;
      setClosing(false);
      if (!node.open) node.showModal();
      return;
    }

    if (!node.open) return;

    let cancelled = false;
    const controller = new AbortController();
    exitAbortRef.current?.abort();
    exitAbortRef.current = controller;
    setClosing(true);

    void (async () => {
      if (!prefersReducedMotion()) {
        await waitForExitTransition(node, { signal: controller.signal });
      }
      if (cancelled || controller.signal.aborted) return;
      skipCloseSyncRef.current = true;
      node.close();
      setClosing(false);
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [open]);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    const handleClose = () => {
      if (skipCloseSyncRef.current) {
        skipCloseSyncRef.current = false;
        return;
      }
      onOpenChange(false);
    };
    node.addEventListener("close", handleClose);
    return () => node.removeEventListener("close", handleClose);
  }, [onOpenChange]);

  useEffect(() => {
    return () => exitAbortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setActiveIndex(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  function requestClose() {
    if (!open || closing) return;
    onOpenChange(false);
  }

  function selectItem(item: CommandPaletteItem) {
    item.onSelect();
    requestClose();
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
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.content}
      aria-label="Command palette"
      data-open={dataAttr(open || closing)}
      data-closing={dataAttr(closing)}
      data-blur={dataAttr(blur)}
      onClick={(event) => {
        if (event.target === dialogRef.current) requestClose();
      }}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        requestClose();
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
