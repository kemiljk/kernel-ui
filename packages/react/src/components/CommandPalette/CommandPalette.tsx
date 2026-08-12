import { useEffect, useId, useMemo, useRef, useState } from "react";
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

export interface CommandPaletteGroup {
  id: string;
  label?: string;
  items: CommandPaletteItem[];
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items?: CommandPaletteItem[];
  groups?: CommandPaletteGroup[];
  placeholder?: string;
  emptyMessage?: ReactNode;
  /** Light frost on the `::backdrop` (`backdrop-filter: blur(8px)`). */
  blur?: boolean;
  renderItem?: (
    item: CommandPaletteItem,
    state: { active: boolean; group?: CommandPaletteGroup; index: number },
  ) => ReactNode;
}

function matchesQuery(item: CommandPaletteItem, query: string) {
  const q = query.toLowerCase();
  return (
    item.label.toLowerCase().includes(q) ||
    (item.description?.toLowerCase().includes(q) ?? false)
  );
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
  items = [],
  groups,
  placeholder = "Filter commands",
  emptyMessage = "No results",
  blur = false,
  renderItem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [closing, setClosing] = useState(false);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const exitAbortRef = useRef<AbortController | null>(null);
  const skipCloseSyncRef = useRef(false);
  const keyboardNavRef = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = useMemo(() => {
    const isGrouped = Boolean(groups && groups.length > 0);
    const sourceGroups = isGrouped ? (groups as CommandPaletteGroup[]) : [{ id: "__items__", items }];
    const filteredGroups = sourceGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => matchesQuery(item, query)) }))
      .filter((group) => group.items.length > 0);

    const entries: Array<{ item: CommandPaletteItem; group?: CommandPaletteGroup; flatIndex: number }> = [];
    for (const group of filteredGroups) {
      for (const item of group.items) {
        entries.push({ item, group: isGrouped ? group : undefined, flatIndex: entries.length });
      }
    }

    return { filteredGroups, entries, isGrouped };
  }, [groups, items, query]);

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

  useEffect(() => {
    if (filtered.entries.length === 0) {
      setActiveIndex(0);
      return;
    }
    setActiveIndex((index) => Math.min(index, filtered.entries.length - 1));
  }, [filtered.entries.length]);

  /** Only keyboard nav auto-scrolls the active item into view — hover
   * (`onPointerMove` below) sets `activeIndex` too, and scrolling out from
   * under a stationary pointer would fight the user rather than help. */
  useEffect(() => {
    if (!keyboardNavRef.current) return;
    keyboardNavRef.current = false;
    dialogRef.current
      ?.querySelector(`[id="${listboxId}-option-${activeIndex}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, listboxId]);

  function requestClose() {
    if (!open || closing) return;
    onOpenChange(false);
  }

  function selectItem(item: CommandPaletteItem) {
    item.onSelect();
    requestClose();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const maxIndex = filtered.entries.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (maxIndex < 0) break;
        keyboardNavRef.current = true;
        setActiveIndex((index) => Math.min(index + 1, maxIndex));
        break;
      case "ArrowUp":
        event.preventDefault();
        if (maxIndex < 0) break;
        keyboardNavRef.current = true;
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const active = filtered.entries[activeIndex]?.item;
        if (active) {
          event.preventDefault();
          selectItem(active);
        }
        break;
      }
    }
  }

  const activeEntry = filtered.entries[activeIndex];

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
        aria-activedescendant={activeEntry ? `${listboxId}-option-${activeEntry.flatIndex}` : undefined}
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
        {filtered.entries.length === 0 ? (
          <div className={styles.empty}>{emptyMessage}</div>
        ) : (
          (() => {
            const nodes: ReactNode[] = [];
            let flatIndex = 0;

            for (const group of filtered.filteredGroups) {
              const headerId = group.label ? `${listboxId}-group-${group.id}` : undefined;

              const itemNodes = group.items.map((item) => {
                const currentIndex = flatIndex++;
                const isActive = currentIndex === activeIndex;
                return (
                  <div
                    key={`${group.id}-${item.id}`}
                    id={`${listboxId}-option-${currentIndex}`}
                    role="option"
                    aria-selected={isActive}
                    data-active={dataAttr(isActive)}
                    className={styles.option}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerMove={() => setActiveIndex(currentIndex)}
                    onClick={() => selectItem(item)}
                  >
                    {typeof renderItem === "function"
                      ? renderItem(item, {
                          active: isActive,
                          group: filtered.isGrouped ? group : undefined,
                          index: currentIndex,
                        })
                      : (
                          <>
                            <div className={styles.optionLabel}>{item.label}</div>
                            {item.description ? (
                              <div className={styles.optionDescription}>{item.description}</div>
                            ) : null}
                          </>
                        )}
                  </div>
                );
              });

              if (headerId) {
                nodes.push(
                  <div key={`${group.id}-group`} role="group" aria-labelledby={headerId}>
                    <div id={headerId} role="presentation" className={styles.groupLabel}>
                      {group.label}
                    </div>
                    {itemNodes}
                  </div>,
                );
              } else {
                nodes.push(...itemNodes);
              }
            }

            return nodes;
          })()
        )}
      </div>
    </dialog>
  );
}
