import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import { usePopoverExit } from "../../utils/usePopoverExit";
import styles from "./Combobox.module.css";

export interface ComboboxOption {
  value: string;
  label: string;
}

export interface ComboboxGroup {
  id: string;
  label?: string;
  items: ComboboxOption[];
}

export interface ComboboxProps {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  /** Set to `false` to hard-align the label flush with the field's left
   * edge, undoing the default inset that lines it up with the input's own
   * text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  options?: ComboboxOption[];
  groups?: ComboboxGroup[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  emptyMessage?: ReactNode;
  /** Which side of the field the listbox opens on. */
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the field. */
  align?: FloatingAlign;
  /** Gap between the field and the listbox, in pixels. */
  offset?: number;
  renderOption?: (
    option: ComboboxOption,
    state: { active: boolean; selected: boolean; group?: ComboboxGroup; index: number },
  ) => ReactNode;
}

/**
 * The WAI-ARIA 1.2 combobox pattern: a real `<input role="combobox">`
 * that keeps DOM focus the whole time, an `aria-activedescendant`
 * pointing at whichever option is highlighted (the highlight moves,
 * focus doesn't), and a `role="listbox"` popup. `popover="manual"` is
 * used deliberately, this needs its own open/close rules (open on
 * focus or typing, not just a single click), so light-dismiss is
 * handled by hand: Escape in the keydown handler, outside-click via
 * the effect below.
 */
export function Combobox({
  label,
  hideLabel = false,
  labelOffset = true,
  options = [],
  groups,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  emptyMessage = "No results",
  placement = "bottom",
  align = "center",
  offset = 8,
  renderOption,
}: ComboboxProps) {
  const [selectedValue, setSelectedValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const sourceOptions = useMemo(
    () => (groups && groups.length > 0 ? groups.flatMap((group) => group.items) : options),
    [groups, options],
  );
  const selectedOption = sourceOptions.find((option) => option.value === selectedValue);

  const [inputText, setInputText] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = useMemo(() => {
    const sourceGroups = groups && groups.length > 0 ? groups : [{ id: "__items__", items: options }];
    const filteredGroups = sourceGroups
      .map((group) => ({
        ...group,
        items: group.items.filter((option) => option.label.toLowerCase().includes(inputText.toLowerCase())),
      }))
      .filter((group) => group.items.length > 0);

    const entries: Array<{ option: ComboboxOption; group?: ComboboxGroup; flatIndex: number }> = [];
    for (const group of filteredGroups) {
      for (const option of group.items) {
        entries.push({ option, group, flatIndex: entries.length });
      }
    }

    return { filteredGroups, entries };
  }, [groups, inputText, options]);

  const { anchorRef, floatingRef } = useFloatingPosition<HTMLInputElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const { closing, playExit, cancelExit } = usePopoverExit(listboxRef);

  function openList() {
    cancelExit();
    if (open) return;
    setOpen(true);
    listboxRef.current?.showPopover?.();
  }

  /** `open` flips immediately — `aria-expanded` and the keyboard
   * handlers shouldn't keep treating a listbox the user has dismissed
   * as live just because its fade hasn't finished. `playExit` only owns
   * the visual tail, and hides the popover once that's done. */
  function closeList() {
    if (!open) return;
    setOpen(false);
    setActiveIndex(-1);
    void playExit();
  }

  function selectOption(option: ComboboxOption) {
    setSelectedValue(option.value);
    setInputText(option.label);
    closeList();
  }

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) closeList();
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (filtered.entries.length === 0) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex((index) => Math.min(index, filtered.entries.length - 1));
  }, [filtered.entries.length]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const maxIndex = filtered.entries.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openList();
          setActiveIndex(maxIndex >= 0 ? 0 : -1);
        } else if (maxIndex >= 0) {
          setActiveIndex((index) => Math.min(index + 1, maxIndex));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        if (maxIndex < 0) break;
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const active = filtered.entries[activeIndex]?.option;
        if (open && active) {
          event.preventDefault();
          selectOption(active);
        }
        break;
      }
      case "Escape":
        closeList();
        break;
    }
  }

  const activeEntry = filtered.entries[activeIndex];

  return (
    <div
      className={styles.root}
      ref={rootRef}
      data-label-offset={labelOffset === false ? "false" : undefined}
    >
      <label
        htmlFor={id}
        className={[styles.label, hideLabel ? "kernel-sr-only" : null]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </label>
      <input
        ref={mergeRefs(inputRef, anchorRef)}
        id={id}
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={activeEntry ? `${listboxId}-option-${activeEntry.flatIndex}` : undefined}
        value={inputText}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={openList}
        onChange={(event) => {
          setInputText(event.target.value);
          setActiveIndex(0);
          openList();
        }}
        onKeyDown={handleKeyDown}
        className={styles.input}
      />
      <div
        ref={mergeRefs(listboxRef, floatingRef)}
        id={listboxId}
        role="listbox"
        popover="manual"
        data-slot="combobox-listbox"
        data-placement={placement}
        data-align={align}
        data-open={dataAttr(open)}
        data-closing={dataAttr(closing)}
        className={styles.listbox}
      >
        {filtered.entries.length === 0 ? (
          <div className={styles.empty}>{emptyMessage}</div>
        ) : (
          (() => {
            const nodes: ReactNode[] = [];
            let previousGroupId: string | undefined;

            for (const entry of filtered.entries) {
              const { option, group, flatIndex } = entry;
              if (group && group.label && group.id !== previousGroupId) {
                nodes.push(
                  <div key={`${group.id}-header`} className={styles.groupLabel}>
                    {group.label}
                  </div>,
                );
                previousGroupId = group.id;
              }

              const isActive = flatIndex === activeIndex;
              const isSelected = option.value === selectedValue;
              nodes.push(
                <div
                  key={`${group?.id ?? "items"}-${option.value}`}
                  id={`${listboxId}-option-${flatIndex}`}
                  role="option"
                  aria-selected={isSelected}
                  data-active={dataAttr(isActive)}
                  className={styles.option}
                  onPointerDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(flatIndex)}
                  onClick={() => selectOption(option)}
                >
                  {typeof renderOption === "function"
                    ? renderOption(option, {
                        active: isActive,
                        selected: isSelected,
                        group,
                        index: flatIndex,
                      })
                    : option.label}
                </div>,
              );
            }

            return nodes;
          })()
        )}
      </div>
    </div>
  );
}
