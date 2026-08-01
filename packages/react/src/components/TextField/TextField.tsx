import { forwardRef, useId, useState } from "react";
import type { FocusEvent, InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./TextField.module.css";

export interface TextFieldState {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  focused: boolean;
  filled: boolean;
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
  labelClassName?: ClassNameValue<TextFieldState>;
  descriptionClassName?: ClassNameValue<TextFieldState>;
  errorClassName?: ClassNameValue<TextFieldState>;
}

function readFilled(
  value: InputHTMLAttributes<HTMLInputElement>["value"],
  defaultValue: InputHTMLAttributes<HTMLInputElement>["defaultValue"],
  uncontrolled: string,
): boolean {
  if (value !== undefined && value !== null) return String(value).length > 0;
  if (defaultValue !== undefined && defaultValue !== null && uncontrolled === String(defaultValue)) {
    return String(defaultValue).length > 0;
  }
  return uncontrolled.length > 0;
}

/**
 * A native `<label>` + `<input>` pair with correct `aria-describedby`
 * wiring for hint and error text. `:user-invalid` handles the live,
 * post-interaction validation styling natively; the `invalid` prop is for
 * validation you already know about (a failed server response, for
 * example) before the user has touched the field.
 *
 * Slot class hooks (`wrapperClassName`, `labelClassName`, …) and
 * `data-focused` / `data-filled` on the wrapper let unstyled consumers
 * drive floating-label animations without targeting generated classes.
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
      labelClassName,
      descriptionClassName,
      errorClassName,
      type = "text",
      value,
      defaultValue,
      onChange,
      onFocus,
      onBlur,
      onAnimationStart,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    const [focused, setFocused] = useState(false);
    const [uncontrolledValue, setUncontrolledValue] = useState(() =>
      defaultValue !== undefined && defaultValue !== null ? String(defaultValue) : "",
    );
    const [autofilled, setAutofilled] = useState(false);

    const filled =
      autofilled || readFilled(value, defaultValue, uncontrolledValue);

    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: TextFieldState = { invalid, disabled, required, focused, filled };

    return (
      <div
        data-slot="text-field"
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-focused={dataAttr(focused)}
        data-filled={dataAttr(filled)}
        data-size={size}
        data-label-offset={labelOffset === false ? "false" : undefined}
      >
        <label
          data-slot="text-field-label"
          className={[
            styles.label,
            hideLabel ? "kernel-sr-only" : null,
            resolveClassName(labelClassName, state),
          ]
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
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-slot="text-field-control"
          className={[styles.input, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => {
            if (value === undefined) setUncontrolledValue(event.target.value);
            setAutofilled(false);
            onChange?.(event);
          }}
          onFocus={(event: FocusEvent<HTMLInputElement>) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: FocusEvent<HTMLInputElement>) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onAnimationStart={(event) => {
            // Chromium fires an animation named `onAutoFillStart` (via UA
            // stylesheet) when autofill paints — the practical hook for
            // detecting filled-without-input state.
            if (event.animationName.toLowerCase().includes("onautofillstart")) {
              setAutofilled(true);
            }
            onAnimationStart?.(event);
          }}
        />
        {showError ? (
          <p
            data-slot="text-field-error"
            className={[styles.error, resolveClassName(errorClassName, state)]
              .filter(Boolean)
              .join(" ")}
            id={errorId}
            role="alert"
          >
            {errorMessage}
          </p>
        ) : description ? (
          <p
            data-slot="text-field-description"
            className={[styles.description, resolveClassName(descriptionClassName, state)]
              .filter(Boolean)
              .join(" ")}
            id={descriptionId}
          >
            {description}
          </p>
        ) : null}
      </div>
    );
  },
);
