import { forwardRef, useEffect, useId, useRef } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { inputModality, trackInputModality, type ChangeDetails } from "../../utils/changeDetails";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { emitChange } from "../../utils/useControllableState";
import styles from "./Select.module.css";

export interface SelectState {
  invalid: boolean;
  disabled: boolean;
}

/** What picked an option: a click or tap, arrow keys / Enter / Space, or
 * typing the start of an option's text (the native typeahead). */
export type SelectChangeReason = "item-press" | "keyboard" | "typeahead";

export interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  description?: ReactNode;
  errorMessage?: ReactNode;
  /** Set to `false` to hard-align the label, description, and error text
   * flush with the field's left edge, undoing the default inset that lines
   * them up with the select's own text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  invalid?: boolean;
  /** Called before a new option is committed, with its value and the
   * reason; `details.cancel()` puts the previous option back (and skips
   * `onChange`). The native `onChange` still works as it always has. */
  onValueChange?: (value: string, details: ChangeDetails<SelectChangeReason>) => void;
  className?: ClassNameValue<SelectState>;
}

/**
 * A real `<select>`: the browser owns selection, keyboard navigation,
 * typeahead, and form behaviour. Supporting browsers opt into a token-styled
 * native picker with `appearance: base-select`; others retain the existing
 * styled control and platform picker. Plain options keep SSR markup portable.
 *
 * `onValueChange` reports *why* the value changed by remembering the last
 * pointer or key on the control, since a native `change` event doesn't say.
 * With the platform's own picker (a separate OS menu on some systems) the
 * keys pressed inside it may never reach the page, so treat the reason as
 * best-effort there.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  {
    label,
    hideLabel = false,
    description,
    errorMessage,
    labelOffset = true,
    invalid = false,
    required = false,
    disabled = false,
    id,
    className,
    children,
    onValueChange,
    onChange,
    onKeyDown,
    onPointerDown,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const selectRef = useRef<HTMLSelectElement>(null);
  const previousValueRef = useRef<string | null>(null);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    trackInputModality();
    if (selectRef.current) previousValueRef.current = selectRef.current.value;
  });
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const errorId = `${selectId}-error`;

  const showError = invalid && Boolean(errorMessage);
  // The error replaces the description while it shows, so only one id is
  // ever referenced: pointing at both left a dangling aria-describedby.
  const describedBy = showError ? errorId : description ? descriptionId : undefined;

  const state: SelectState = { invalid, disabled };

  return (
    <div
      className={styles.root}
      data-invalid={dataAttr(invalid)}
      data-disabled={dataAttr(disabled)}
      data-label-offset={labelOffset === false ? "false" : undefined}
    >
      <label
        className={[styles.label, hideLabel ? "kernel-sr-only" : null]
          .filter(Boolean)
          .join(" ")}
        htmlFor={selectId}
      >
        {label}
        {required ? (
          <span className={styles.required} aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div className={styles.controlWrapper}>
        <select
          {...rest}
          ref={mergeRefs(ref, selectRef)}
          id={selectId}
          onKeyDown={(event) => {
            lastKeyRef.current = event.key;
            onKeyDown?.(event);
          }}
          onPointerDown={(event) => {
            lastKeyRef.current = null;
            onPointerDown?.(event);
          }}
          onChange={(event) => {
            const key = lastKeyRef.current;
            const reason: SelectChangeReason =
              inputModality(event) !== "keyboard"
                ? "item-press"
                : key && key.length === 1 && key !== " "
                  ? "typeahead"
                  : "keyboard";
            if (!emitChange(onValueChange, event.target.value, reason, event)) {
              // Vetoed: put the previous option back. A controlled select
              // would be restored by React anyway; an uncontrolled one won't.
              if (previousValueRef.current !== null) event.target.value = previousValueRef.current;
              return;
            }
            previousValueRef.current = event.target.value;
            onChange?.(event);
          }}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={[styles.select, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
        >
          {children}
        </select>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      {showError ? (
        <p className={styles.error} id={errorId} role="alert">
          {errorMessage}
        </p>
      ) : description ? (
        <p className={styles.description} id={descriptionId}>
          {description}
        </p>
      ) : null}
    </div>
  );
});

export interface SelectOptionProps {
  value: string;
  children: ReactNode;
  disabled?: boolean;
}

/** Thin re-export so consumers don't have to reach for a raw `<option>`
 * inside JSX styled with anything else, it's the same element either way. */
export function SelectOption({ value, children, disabled }: SelectOptionProps) {
  return (
    <option value={value} disabled={disabled}>
      {children}
    </option>
  );
}
