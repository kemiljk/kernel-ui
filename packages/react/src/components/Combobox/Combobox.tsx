import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import type { InputHTMLAttributes, KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs } from "../../utils/polymorphic";
import { inputModality, type ChangeDetails, type ChangeEventSource } from "../../utils/changeDetails";
import { fuzzyScore, fuzzySegments } from "../../utils/fuzzy";
import { useControllableStateWithDetails } from "../../utils/useControllableState";
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

/** What changed a `Combobox`'s selection: a click or tap on an option,
 * Enter on the highlighted option, or emptying the text field. */
export type ComboboxChangeReason = "item-press" | "keyboard" | "clear";

/** A custom filter: return a score above 0 to keep an option (higher ranks
 * first) or 0 to hide it. Same shape as cmdk's `filter`. */
export type ComboboxFilter = (text: string, query: string, keywords?: string[]) => number;

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
  /** Called before the selection changes, with the reason (`"item-press"`, `"keyboard"` or `"clear"`); `details.cancel()`
   * keeps the current selection (and the listbox open). */
  onValueChange?: (value: string, details: ChangeDetails<ComboboxChangeReason>) => void;
  placeholder?: string;
  emptyMessage?: ReactNode;
  shouldFilter?: boolean;
  /** Replace the built-in ranked fuzzy match (see `fuzzyScore`). Return a
   * score above 0 to keep an option, higher first; 0 hides it. */
  filter?: ComboboxFilter;
  /** Which side of the field the listbox opens on. */
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the field. */
  align?: FloatingAlign;
  /** Gap between the field and the listbox, in pixels. */
  offset?: number;
  renderOption?: (
    option: ComboboxOption,
    state: {
      active: boolean;
      selected: boolean;
      group?: ComboboxGroup;
      index: number;
      /** Matched `[start, end)` spans of `option.label` for the current
       * query, for drawing your own highlight. Empty with a custom `filter`. */
      matches: Array<[number, number]>;
    },
  ) => ReactNode;
  children?: ReactNode;
}

export interface ComboboxInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export interface ComboboxItemProps {
  id?: string;
  value: string;
  keywords?: string[];
  disabled?: boolean;
  onSelect?: () => void;
  children: ReactNode | ((state: { active: boolean; selected: boolean }) => ReactNode);
}

export interface ComboboxGroupProps {
  id?: string;
  heading?: ReactNode;
  children: ReactNode;
}

interface RegisteredOption {
  id: string;
  value: string;
  keywords: string[];
  disabled: boolean;
  onSelect?: () => void;
  group?: ComboboxGroup;
}

interface CompoundComboboxContext {
  listboxId: string;
  query: string;
  selectedValue: string;
  activeId: string | null;
  options: RegisteredOption[];
  shouldFilter: boolean;
  setQuery: (value: string) => void;
  registerOption: (option: RegisteredOption) => () => void;
  setActiveId: (id: string) => void;
  selectOption: (option: RegisteredOption, event?: ChangeEventSource) => void;
  isVisible: (option: RegisteredOption) => boolean;
  openList: () => void;
  closeList: () => void;
  setInputElement: (element: HTMLInputElement | null) => void;
  setListboxElement: (element: HTMLDivElement | null) => void;
}

const CompoundComboboxContext = createContext<CompoundComboboxContext | null>(null);
const CompoundComboboxGroupContext = createContext<ComboboxGroup | undefined>(undefined);
const noKeywords: string[] = [];

function useCompoundCombobox() {
  const context = useContext(CompoundComboboxContext);
  if (!context) throw new Error("Combobox compound components must be used inside Combobox");
  return context;
}

function compoundMatches(option: RegisteredOption, query: string, filter?: ComboboxFilter) {
  if (!query.trim()) return true;
  if (filter) return filter(option.value, query, option.keywords) > 0;
  return [option.value, ...option.keywords].some((text) => fuzzyScore(query, text) !== null);
}

/** Matched label text wrapped in `<mark>`, the rest plain. */
function Highlighted({ text, ranges }: { text: string; ranges: Array<[number, number]> }) {
  if (ranges.length === 0) return <>{text}</>;
  return (
    <>
      {fuzzySegments(text, ranges).map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.match}>
            {segment.text}
          </mark>
        ) : (
          segment.text
        ),
      )}
    </>
  );
}

function CompoundComboboxInput({ value, onValueChange, ...props }: ComboboxInputProps) {
  const context = useCompoundCombobox();
  const selectable = context.options.filter((option) => !option.disabled && context.isVisible(option));
  const activeIndex = selectable.findIndex((option) => option.id === context.activeId);
  useEffect(() => {
    if (value !== undefined) context.setQuery(value);
  }, [context, value]);
  return (
    <input
      {...props}
      ref={context.setInputElement}
      type={props.type ?? "text"}
      role="combobox"
      aria-expanded="true"
      aria-controls={context.listboxId}
      aria-autocomplete="list"
      aria-activedescendant={context.activeId ?? undefined}
      value={value ?? context.query}
      autoComplete="off"
      onFocus={context.openList}
      onChange={(event) => { context.setQuery(event.target.value); onValueChange?.(event.target.value); context.openList(); }}
      onKeyDown={(event) => {
        props.onKeyDown?.(event);
        if (event.defaultPrevented) return;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          const nextIndex = event.key === "ArrowDown"
            ? Math.min(activeIndex + 1, selectable.length - 1)
            : Math.max(activeIndex - 1, 0);
          context.setActiveId(selectable[nextIndex]?.id ?? "");
        } else if (event.key === "Enter") {
          const active = selectable[activeIndex];
          if (active) { event.preventDefault(); context.selectOption(active, event); }
        } else if (event.key === "Escape") context.closeList();
      }}
      className={[styles.input, props.className].filter(Boolean).join(" ")}
    />
  );
}

function CompoundComboboxItem({ id, value, keywords, disabled = false, onSelect, children }: ComboboxItemProps) {
  const context = useCompoundCombobox();
  const group = useContext(CompoundComboboxGroupContext);
  const generated = useId();
  const optionId = id ?? `${context.listboxId}-option-${generated.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const normalizedKeywords = keywords ?? noKeywords;
  const option = useMemo(() => ({ id: optionId, value, keywords: normalizedKeywords, disabled, onSelect, group }), [disabled, group, normalizedKeywords, onSelect, optionId, value]);
  useEffect(() => context.registerOption(option), [context.registerOption, option]);
  if (!context.isVisible(option)) return null;
  const active = context.activeId === optionId;
  const selected = context.selectedValue === value;
  return (
    <div id={optionId} role="option" aria-selected={selected} aria-disabled={disabled || undefined} data-active={dataAttr(active)} className={styles.option}
      onPointerDown={(event) => event.preventDefault()}
      onPointerMove={() => { if (!disabled) context.setActiveId(optionId); }}
      onClick={(event) => { if (!disabled) context.selectOption(option, event); }}>
      {typeof children === "function" ? children({ active, selected }) : children}
    </div>
  );
}

function CompoundComboboxGroup({ id, heading, children }: ComboboxGroupProps) {
  const context = useCompoundCombobox();
  const generated = useId();
  const groupId = id ?? `${context.listboxId}-group-${generated.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const headingId = `${groupId}-heading`;
  const group = useMemo(() => ({ id: groupId, label: typeof heading === "string" ? heading : undefined, items: [] }), [groupId, heading]);
  return <CompoundComboboxGroupContext.Provider value={group}><div role="group" aria-labelledby={heading !== undefined ? headingId : undefined}>{heading !== undefined ? <div id={headingId} role="presentation" className={styles.groupLabel}>{heading}</div> : null}{children}</div></CompoundComboboxGroupContext.Provider>;
}

function CompoundComboboxList({ children }: { children: ReactNode }) {
  const context = useCompoundCombobox();
  return <div ref={context.setListboxElement} id={context.listboxId} role="listbox" popover="manual" data-slot="combobox-listbox" className={styles.listbox}>{children}</div>;
}

function CompoundComboboxEmpty({ children }: { children: ReactNode }) { return <div className={styles.empty}>{children}</div>; }
function CompoundComboboxLoading({ children }: { children: ReactNode }) { return <div role="status" className={styles.empty}>{children}</div>; }

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
  shouldFilter = true,
  filter,
  placement = "bottom",
  align = "center",
  offset = 8,
  renderOption,
  children,
}: ComboboxProps) {
  const [selectedValue, setSelectedValue] = useControllableStateWithDetails<string, ComboboxChangeReason>({
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
  const [compoundQuery, setCompoundQuery] = useState("");
  const [compoundOptions, setCompoundOptions] = useState<RegisteredOption[]>([]);
  const [compoundActiveId, setCompoundActiveId] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const keyboardNavRef = useRef(false);
  const id = useId();
  const listboxId = `${id}-listbox`;

  const filtered = useMemo(() => {
    const isGrouped = Boolean(groups && groups.length > 0);
    const sourceGroups = isGrouped ? (groups as ComboboxGroup[]) : [{ id: "__items__", items: options }];
    const query = shouldFilter ? inputText : "";
    const ranked = query.trim() !== "";
    // Ranked fuzzy match, best first within each group (groups keep their
    // order). The DOM order is the ranked order, so arrow keys, screen
    // readers and the eye all agree on what's "next".
    const matchesByOption = new Map<ComboboxOption, Array<[number, number]>>();
    const filteredGroups = sourceGroups
      .map((group) => {
        const scored: Array<{ option: ComboboxOption; score: number; index: number }> = [];
        group.items.forEach((option, index) => {
          if (!ranked) {
            scored.push({ option, score: 0, index });
            matchesByOption.set(option, []);
            return;
          }
          if (filter) {
            const score = filter(option.label, query);
            if (score > 0) {
              scored.push({ option, score, index });
              matchesByOption.set(option, []);
            }
            return;
          }
          const match = fuzzyScore(query, option.label);
          if (match) {
            scored.push({ option, score: match.score, index });
            matchesByOption.set(option, match.ranges);
          }
        });
        if (ranked) scored.sort((a, b) => b.score - a.score || a.index - b.index);
        return { ...group, items: scored.map((entry) => entry.option) };
      })
      .filter((group) => group.items.length > 0);

    const entries: Array<{ option: ComboboxOption; group?: ComboboxGroup; flatIndex: number }> = [];
    for (const group of filteredGroups) {
      for (const option of group.items) {
        entries.push({ option, group: isGrouped ? group : undefined, flatIndex: entries.length });
      }
    }

    return { filteredGroups, entries, isGrouped, matchesByOption };
  }, [filter, groups, inputText, options, shouldFilter]);

  const { anchorRef, floatingRef } = useFloatingPosition<HTMLInputElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const { closing, playExit, cancelExit } = usePopoverExit(listboxRef);

  const registerOption = useCallback((option: RegisteredOption) => {
    setCompoundOptions((current) => [...current.filter((entry) => entry.id !== option.id), option]);
    return () => setCompoundOptions((current) => current.filter((entry) => entry.id !== option.id));
  }, []);
  const compoundVisible = useCallback(
    (option: RegisteredOption) => !shouldFilter || compoundMatches(option, compoundQuery, filter),
    [compoundQuery, filter, shouldFilter],
  );
  const compoundSelectable = useMemo(
    () => compoundOptions.filter((option) => !option.disabled && compoundVisible(option)),
    [compoundOptions, compoundVisible],
  );
  const compoundSetActiveId = useCallback((nextId: string) => setCompoundActiveId(nextId || null), []);
  const setInputElement = useCallback((element: HTMLInputElement | null) => {
    inputRef.current = element;
    anchorRef.current = element;
  }, [anchorRef]);
  const setListboxElement = useCallback((element: HTMLDivElement | null) => {
    listboxRef.current = element;
    floatingRef.current = element;
  }, [floatingRef]);

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

  function selectOption(option: ComboboxOption, event: ChangeEventSource) {
    const reason = inputModality(event) === "keyboard" ? "keyboard" : "item-press";
    if (!setSelectedValue(option.value, reason, event)) return;
    setInputText(option.label);
    closeList();
  }

  const selectCompoundOption = useCallback((option: RegisteredOption, event?: ChangeEventSource) => {
    const reason = inputModality(event) === "keyboard" ? "keyboard" : "item-press";
    if (!setSelectedValue(option.value, reason, event)) return;
    setCompoundQuery(option.value);
    option.onSelect?.();
    closeList();
  }, [closeList, setSelectedValue]);

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

  /** Only keyboard nav auto-scrolls the active option into view — hover
   * (`onPointerMove` below) sets `activeIndex` too, and scrolling out from
   * under a stationary pointer would fight the user rather than help. */
  useEffect(() => {
    if (!keyboardNavRef.current) return;
    keyboardNavRef.current = false;
    if (activeIndex < 0) return;
    listboxRef.current
      ?.querySelector(`[id="${listboxId}-option-${activeIndex}"]`)
      ?.scrollIntoView?.({ block: "nearest" });
  }, [activeIndex, listboxId]);

  useEffect(() => {
    setCompoundActiveId((current) => compoundSelectable.some((option) => option.id === current)
      ? current
      : compoundSelectable[0]?.id ?? null);
  }, [compoundSelectable]);

  const compoundContext = useMemo<CompoundComboboxContext>(() => ({
    listboxId,
    query: compoundQuery,
    selectedValue,
    activeId: compoundActiveId,
    options: compoundOptions,
    shouldFilter,
    setQuery: setCompoundQuery,
    registerOption,
    setActiveId: compoundSetActiveId,
    selectOption: selectCompoundOption,
    isVisible: compoundVisible,
    openList,
    closeList,
    setInputElement,
    setListboxElement,
  }), [closeList, compoundActiveId, compoundOptions, compoundQuery, compoundSetActiveId, compoundVisible, listboxId, openList, registerOption, selectCompoundOption, selectedValue, setInputElement, setListboxElement, shouldFilter]);

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const maxIndex = filtered.entries.length - 1;

    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        keyboardNavRef.current = true;
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
        keyboardNavRef.current = true;
        setActiveIndex((index) => Math.max(index - 1, 0));
        break;
      case "Enter": {
        const active = filtered.entries[activeIndex]?.option;
        if (open && active) {
          event.preventDefault();
          selectOption(active, event);
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
    <CompoundComboboxContext.Provider value={compoundContext}>
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
      {children ? children : <input
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
          // Emptying the field clears the selection, rather than leaving a
          // value selected behind a blank input.
          if (event.target.value === "" && selectedValue !== "") setSelectedValue("", "clear", event);
        }}
        onKeyDown={handleKeyDown}
        className={styles.input}
      />}
      {children ? null : <div
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
            let flatIndex = 0;

            for (const group of filtered.filteredGroups) {
              const headerId = group.label ? `${listboxId}-group-${group.id}` : undefined;

              const optionNodes = group.items.map((option) => {
                const currentIndex = flatIndex++;
                const isActive = currentIndex === activeIndex;
                const isSelected = option.value === selectedValue;
                return (
                  <div
                    key={`${group.id}-${option.value}`}
                    id={`${listboxId}-option-${currentIndex}`}
                    role="option"
                    aria-selected={isSelected}
                    data-active={dataAttr(isActive)}
                    className={styles.option}
                    onPointerDown={(event) => event.preventDefault()}
                    onPointerMove={() => setActiveIndex(currentIndex)}
                    onClick={(event) => selectOption(option, event)}
                  >
                    {typeof renderOption === "function"
                      ? renderOption(option, {
                          active: isActive,
                          selected: isSelected,
                          group: filtered.isGrouped ? group : undefined,
                          index: currentIndex,
                          matches: filtered.matchesByOption.get(option) ?? [],
                        })
                      : <Highlighted text={option.label} ranges={filtered.matchesByOption.get(option) ?? []} />}
                  </div>
                );
              });

              if (headerId) {
                nodes.push(
                  <div key={`${group.id}-group`} role="group" aria-labelledby={headerId}>
                    <div id={headerId} role="presentation" className={styles.groupLabel}>
                      {group.label}
                    </div>
                    {optionNodes}
                  </div>,
                );
              } else {
                nodes.push(...optionNodes);
              }
            }

            return nodes;
          })()
        )}
      </div>}
    </div>
    </CompoundComboboxContext.Provider>
  );
}

export namespace Combobox {
  export const Input = CompoundComboboxInput;
  export const List = CompoundComboboxList;
  export const Group = CompoundComboboxGroup;
  export const Item = CompoundComboboxItem;
  export const Empty = CompoundComboboxEmpty;
  export const Loading = CompoundComboboxLoading;
}
