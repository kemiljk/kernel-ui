import { forwardRef, useId } from "react";
import type { ReactNode, SelectHTMLAttributes } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Select.module.css";

export interface SelectState {
  invalid: boolean;
  disabled: boolean;
}

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
  className?: ClassNameValue<SelectState>;
}

/**
 * A real `<select>`: the browser owns selection, keyboard navigation,
 * typeahead, and form behaviour. Supporting browsers opt into a token-styled
 * native picker with `appearance: base-select`; others retain the existing
 * styled control and platform picker. Plain options keep SSR markup portable.
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
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const descriptionId = `${selectId}-description`;
  const errorId = `${selectId}-error`;

  const showError = invalid && Boolean(errorMessage);
  const describedBy =
    [showError ? errorId : null, description ? descriptionId : null]
      .filter(Boolean)
      .join(" ") || undefined;

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
          ref={ref}
          id={selectId}
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
