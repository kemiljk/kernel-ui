import { Fragment, forwardRef, useEffect, useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import { Badge, type BadgeState } from "../Badge/Badge";
import styles from "./ModelPicker.module.css";

export type ModelPickerBadge = string | { label: string; variant?: BadgeState["variant"] };

export interface ModelPickerOption {
  value: string;
  /** The model's name, shown in the trigger and the list. Typeahead
   * matches against it. */
  label: string;
  /** One line under the name: what the model is good at, its context
   * size, its price. */
  description?: string;
  /** Provider or family. Consecutive options with the same group are
   * listed under one heading. */
  group?: string;
  /** Short tags ("New", "Fast"). A plain string is a neutral badge. */
  badges?: ModelPickerBadge[];
  /** A provider logo or glyph, decorative: the name already says it. */
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ModelPickerState {
  open: boolean;
  disabled: boolean;
}

/** Built-in strings, overridable for translation via `labels`. */
export interface ModelPickerLabels {
  /** The list's accessible name, and a visually hidden prefix on the
   * trigger so it reads "Model, Opus" rather than just "Opus".
   * Default `"Model"`. */
  model: string;
  /** Trigger text when nothing is selected. Default `"Choose a model"`. */
  placeholder: string;
}

const defaultModelPickerLabels: ModelPickerLabels = {
  model: "Model",
  placeholder: "Choose a model",
};

export interface ModelPickerProps {
  options: ModelPickerOption[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Submits the value with a surrounding form, through a hidden input. */
  name?: string;
  disabled?: boolean;
  /** Which side of the trigger the list opens on. Defaults to `"top"`,
   * since a composer sits at the bottom of the screen; it flips when
   * there's no room. */
  placement?: FloatingPlacement;
  /** Cross-axis alignment. Defaults to `"start"`. */
  align?: FloatingAlign;
  /** Gap between trigger and list, in pixels. Defaults to `8`. */
  offset?: number;
  id?: string;
  /** Classes for the trigger button. */
  className?: ClassNameValue<ModelPickerState>;
  /** Classes for the popup list. */
  listClassName?: ClassNameValue<ModelPickerState>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<ModelPickerLabels>;
}

const TYPEAHEAD_RESET_MS = 500;

/**
 * Picks the model a chat is sent to, from a composer's toolbar: a compact
 * pill `<button>` that opens a `role="listbox"` in a `popover="auto"`.
 *
 * Why not `Select`? A native `<select>` is the right answer for plain
 * options, and Kernel's `Select` is one. A model list isn't plain: each
 * option has a description, badges and a logo, and `<option>` can only hold
 * text everywhere except Chromium's `appearance: base-select`. So this keeps
 * what the platform does give — the popover's top layer, light dismiss,
 * Escape, and focus return to the invoker — and adds the WAI-ARIA listbox
 * pattern by hand: focus moves to the list, `aria-activedescendant` tracks
 * the active option, arrows/Home/End move it, Enter or Space selects,
 * printable keys typeahead, and Tab closes. Groups are `role="group"`
 * labelled by their heading, so a screen reader announces the provider as
 * you cross into it.
 *
 * The trigger is an optical pill sized to `--kernel-control-height-sm` so
 * it sits beside a small send button in `Composer`'s action row (see
 * `Badge.module.css` for the recipe). It opens upward by default, because
 * the composer is at the bottom of the screen.
 */
export const ModelPicker = forwardRef<HTMLButtonElement, ModelPickerProps>(function ModelPicker(
  {
    options,
    value,
    defaultValue,
    onValueChange,
    name,
    disabled = false,
    placement = "top",
    align = "start",
    offset = 8,
    id,
    className,
    listClassName,
    labels,
  },
  ref,
) {
  const l = { ...defaultModelPickerLabels, ...labels };
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const listId = `${baseId}-list`;
  const optionId = (index: number) => `${baseId}-option-${index}`;

  const [selected, setSelected] = useControllableState<string | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as ((value: string | undefined) => void) | undefined,
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const typeahead = useRef({ buffer: "", timer: 0 });
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLButtonElement, HTMLDivElement>({
    open,
    placement,
    align,
    offset,
  });

  const selectedIndex = options.findIndex((option) => option.value === selected);
  const selectedOption = selectedIndex === -1 ? undefined : options[selectedIndex];
  const state: ModelPickerState = { open, disabled };

  // Consecutive options sharing a `group` become one section.
  const sections = useMemo(() => {
    const result: { group?: string; indexes: number[] }[] = [];
    options.forEach((option, index) => {
      const last = result[result.length - 1];
      if (last && last.group === option.group) last.indexes.push(index);
      else result.push({ group: option.group, indexes: [index] });
    });
    return result;
  }, [options]);

  const enabled = (index: number) => index >= 0 && index < options.length && !options[index]!.disabled;

  function step(from: number, direction: 1 | -1): number {
    for (let n = 1; n <= options.length; n++) {
      const index = (from + direction * n + options.length * 2) % options.length;
      if (enabled(index)) return index;
    }
    return from;
  }

  function firstEnabled(fromEnd = false): number {
    const order = options.map((_, index) => index);
    if (fromEnd) order.reverse();
    return order.find(enabled) ?? -1;
  }

  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    function handleToggle(event: Event) {
      const nowOpen = (event as ToggleEvent).newState === "open";
      setOpen(nowOpen);
      if (nowOpen) {
        // Focus moves into the list; the selected model starts active, so
        // arrowing begins from where the reader already is.
        requestAnimationFrame(() => listRef.current?.focus({ preventScroll: true }));
      }
    }
    list.addEventListener("toggle", handleToggle);
    return () => list.removeEventListener("toggle", handleToggle);
  }, []);

  useEffect(() => {
    if (open) setActive((current) => (current === -1 ? (enabled(selectedIndex) ? selectedIndex : firstEnabled()) : current));
    else setActive(-1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || active === -1) return;
    document.getElementById(optionId(active))?.scrollIntoView({ block: "nearest" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, active]);

  useEffect(() => () => window.clearTimeout(typeahead.current.timer), []);

  function show(initial?: number) {
    if (disabled) return;
    if (initial !== undefined) setActive(initial);
    try {
      listRef.current?.showPopover();
    } catch {
      /* already open */
    }
  }

  function close() {
    try {
      listRef.current?.hidePopover();
    } catch {
      /* already closed */
    }
  }

  function choose(index: number) {
    if (!enabled(index)) return;
    setSelected(options[index]!.value);
    close();
    triggerRef.current?.focus();
  }

  /** Typeahead: jumps to the next enabled option whose name starts with
   * what's been typed in the last half second. One repeated letter cycles
   * through the options starting with it, like a native select. */
  function match(key: string, from: number): number {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.buffer += key.toLowerCase();
    state.timer = window.setTimeout(() => {
      state.buffer = "";
    }, TYPEAHEAD_RESET_MS);
    const repeated = state.buffer.split("").every((char) => char === state.buffer[0]);
    const query = repeated ? state.buffer[0]! : state.buffer;
    const startOffset = repeated || state.buffer.length === 1 ? 1 : 0;
    for (let n = 0; n < options.length; n++) {
      const index = (from + startOffset + n + options.length) % options.length;
      if (enabled(index) && options[index]!.label.toLowerCase().startsWith(query)) return index;
    }
    return -1;
  }

  function isTypeaheadKey(event: KeyboardEvent) {
    return event.key.length === 1 && event.key !== " " && !event.ctrlKey && !event.metaKey && !event.altKey;
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      show(enabled(selectedIndex) ? selectedIndex : firstEnabled(event.key === "ArrowUp"));
    } else if (isTypeaheadKey(event)) {
      const found = match(event.key, selectedIndex === -1 ? -1 : selectedIndex);
      if (found !== -1) {
        event.preventDefault();
        show(found);
      }
    }
  }

  function handleListKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((current) => (current === -1 ? firstEnabled() : step(current, 1)));
        return;
      case "ArrowUp":
        event.preventDefault();
        setActive((current) => (current === -1 ? firstEnabled(true) : step(current, -1)));
        return;
      case "Home":
        event.preventDefault();
        setActive(firstEnabled());
        return;
      case "End":
        event.preventDefault();
        setActive(firstEnabled(true));
        return;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        return;
      case "Tab":
        // The list isn't in the tab order; leaving it is leaving the picker.
        close();
        return;
      default:
        if (isTypeaheadKey(event)) {
          const found = match(event.key, active);
          if (found !== -1) {
            event.preventDefault();
            setActive(found);
          }
        }
    }
  }

  const triggerIcon = selectedOption?.icon;

  return (
    <>
      <button
        ref={mergeRefs(ref, triggerRef, anchorRef)}
        id={baseId}
        type="button"
        disabled={disabled}
        popoverTarget={listId}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        data-open={dataAttr(open)}
        data-placeholder={dataAttr(!selectedOption)}
        data-icon-start={triggerIcon ? "true" : undefined}
        data-icon-end="true"
        onKeyDown={handleTriggerKeyDown}
        className={[styles.trigger, resolveClassName(className, state)].filter(Boolean).join(" ")}
      >
        {triggerIcon ? (
          <span className={styles.triggerIcon} aria-hidden="true">
            {triggerIcon}
          </span>
        ) : null}
        <span className={styles.triggerLabel}>
          <span className="kernel-sr-only">{l.model}, </span>
          {selectedOption ? selectedOption.label : l.placeholder}
        </span>
        <span className={styles.triggerIcon} aria-hidden="true">
          <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" fill="none">
            <path
              d="M4.5 6.25 8 9.75l3.5-3.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>
      {name !== undefined ? <input type="hidden" name={name} value={selected ?? ""} /> : null}
      <div
        ref={mergeRefs(listRef, floatingRef)}
        id={listId}
        role="listbox"
        popover="auto"
        tabIndex={-1}
        aria-label={l.model}
        aria-activedescendant={open && active !== -1 ? optionId(active) : undefined}
        data-placement={placement}
        data-align={align}
        data-open={dataAttr(open)}
        onKeyDown={handleListKeyDown}
        className={[styles.list, resolveClassName(listClassName, state)].filter(Boolean).join(" ")}
      >
        {sections.map((section, sectionIndex) => {
          const items = section.indexes.map((index) => {
            const option = options[index]!;
            const isSelected = index === selectedIndex;
            return (
              <div
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                aria-disabled={option.disabled || undefined}
                data-active={dataAttr(index === active)}
                data-disabled={dataAttr(option.disabled)}
                className={styles.option}
                onPointerMove={() => {
                  if (enabled(index) && active !== index) setActive(index);
                }}
                onClick={() => choose(index)}
              >
                {option.icon ? (
                  <span className={styles.optionIcon} aria-hidden="true">
                    {option.icon}
                  </span>
                ) : null}
                <span className={styles.optionText}>
                  <span className={styles.optionTitle}>
                    <span className={styles.optionLabel}>{option.label}</span>
                    {option.badges?.map((badge) => {
                      const { label, variant } =
                        typeof badge === "string" ? { label: badge, variant: undefined } : badge;
                      return (
                        <Badge key={label} variant={variant ?? "neutral"}>
                          {label}
                        </Badge>
                      );
                    })}
                  </span>
                  {option.description ? (
                    <span className={styles.optionDescription}>{option.description}</span>
                  ) : null}
                </span>
                <svg className={styles.check} viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            );
          });
          if (section.group === undefined) {
            // eslint-disable-next-line react/no-array-index-key
            return <Fragment key={`section-${sectionIndex}`}>{items}</Fragment>;
          }
          const headingId = `${baseId}-group-${sectionIndex}`;
          return (
            <div
              // eslint-disable-next-line react/no-array-index-key
              key={`section-${sectionIndex}`}
              role="group"
              aria-labelledby={headingId}
              className={styles.group}
            >
              <div id={headingId} role="presentation" className={styles.groupLabel}>
                {section.group}
              </div>
              {items}
            </div>
          );
        })}
      </div>
    </>
  );
});
