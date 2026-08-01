import { useEffect, useId, useRef, useState } from "react";
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

export interface ComboboxProps {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  /** Set to `false` to hard-align the label flush with the field's left
   * edge, undoing the default inset that lines it up with the input's own
   * text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  options: ComboboxOption[];
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
  options,
  value,
  defaultValue = "",
  onValueChange,
  placeholder,
  emptyMessage = "No results",
  placement = "bottom",
  align = "center",
  offset = 8,
}: ComboboxProps) {
  const [selectedValue, setSelectedValue] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });
  const selectedOption = options.find((option) => option.value === selectedValue);

  const [inputText, setInputText] = useState(selectedOption?.label ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = options.filter((option) =>
    option.label.toLowerCase().includes(inputText.toLowerCase()),
  );

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

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        if (!open) {
          openList();
          setActiveIndex(0);
        } else {
          setActiveIndex((index) => Math.min(index + 1, filtered.length - 1));
        }
        break;
      case "ArrowUp":
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const active = filtered[activeIndex];
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
        aria-activedescendant={activeIndex >= 0 ? `${listboxId}-option-${activeIndex}` : undefined}
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
        {filtered.length === 0 ? (
          <div className={styles.empty}>{emptyMessage}</div>
        ) : (
          filtered.map((option, index) => (
            <div
              key={option.value}
              id={`${listboxId}-option-${index}`}
              role="option"
              aria-selected={option.value === selectedValue}
              data-active={dataAttr(index === activeIndex)}
              className={styles.option}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => selectOption(option)}
            >
              {option.label}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
