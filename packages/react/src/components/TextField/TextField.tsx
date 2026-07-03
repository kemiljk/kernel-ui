import { forwardRef, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./TextField.module.css";

export interface TextFieldState {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

export interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className" | "size"> {
  /** Always rendered as a real `<label>`, always linked to the input,
   * never a placeholder standing in for one — required even when
   * `hideLabel` is set, since it's still the input's accessible name. */
  label: ReactNode;
  /** Visually hides the label (a screen-reader-only, `hideLabel`
   * "removed from the DOM" would produce an unlabeled input, not a
   * simplified one, so this keeps `label` in the accessibility tree and
   * only hides its paint. Reach for this when the surrounding UI
   * already makes the field's purpose obvious (a search bar next to a
   * magnifying-glass icon, a single-field inline form) — the label
   * should stay visible by default everywhere else. */
  hideLabel?: boolean;
  /** Helper text shown below the field when there's no error. */
  description?: ReactNode;
  /** Shown instead of the description, with `role="alert"`, when `invalid`
   * is true. */
  errorMessage?: ReactNode;
  /** Set to `false` to hard-align the label, description, and error text
   * flush with the field's left edge, undoing the default inset that lines
   * them up with the input's own text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: ClassNameValue<TextFieldState>;
  wrapperClassName?: ClassNameValue<TextFieldState>;
}

/**
 * A native `<label>` + `<input>` pair with correct `aria-describedby`
 * wiring for hint and error text. `:user-invalid` handles the live,
 * post-interaction validation styling natively; the `invalid` prop is for
 * validation you already know about (a failed server response, for
 * example) before the user has touched the field.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      hideLabel = false,
      description,
      errorMessage,
      labelOffset = true,
      invalid = false,
      required = false,
      disabled = false,
      size = "md",
      id,
      className,
      wrapperClassName,
      type = "text",
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;

    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: TextFieldState = { invalid, disabled, required };

    return (
      <div
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-size={size}
        data-label-offset={labelOffset === false ? "false" : undefined}
      >
        <label
          className={[styles.label, hideLabel ? "kernel-sr-only" : null]
            .filter(Boolean)
            .join(" ")}
          htmlFor={inputId}
        >
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <input
          {...rest}
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          className={[styles.input, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
        />
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
  },
);
