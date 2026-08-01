import { forwardRef, useId, useState } from "react";
import type { FocusEvent, ReactNode, TextareaHTMLAttributes } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Textarea.module.css";

export interface TextareaState {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
  focused: boolean;
  filled: boolean;
}

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  description?: ReactNode;
  errorMessage?: ReactNode;
  /** Set to `false` to hard-align the label, description, and error text
   * flush with the field's left edge, undoing the default inset that lines
   * them up with the textarea's own text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  invalid?: boolean;
  className?: ClassNameValue<TextareaState>;
  wrapperClassName?: ClassNameValue<TextareaState>;
  labelClassName?: ClassNameValue<TextareaState>;
  descriptionClassName?: ClassNameValue<TextareaState>;
  errorClassName?: ClassNameValue<TextareaState>;
}

function readFilled(
  value: TextareaHTMLAttributes<HTMLTextAreaElement>["value"],
  defaultValue: TextareaHTMLAttributes<HTMLTextAreaElement>["defaultValue"],
  uncontrolled: string,
): boolean {
  if (value !== undefined && value !== null) return String(value).length > 0;
  if (defaultValue !== undefined && defaultValue !== null && uncontrolled === String(defaultValue)) {
    return String(defaultValue).length > 0;
  }
  return uncontrolled.length > 0;
}

/**
 * A real `<textarea>` that grows with its content via
 * `field-sizing: content` instead of a `scrollHeight`-measuring resize
 * listener. Same label/description/error wiring and floating-label state
 * hooks as `TextField`.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
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
      wrapperClassName,
      labelClassName,
      descriptionClassName,
      errorClassName,
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
    const textareaId = id ?? generatedId;
    const descriptionId = `${textareaId}-description`;
    const errorId = `${textareaId}-error`;
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

    const state: TextareaState = { invalid, disabled, required, focused, filled };

    return (
      <div
        data-slot="textarea"
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-focused={dataAttr(focused)}
        data-filled={dataAttr(filled)}
        data-label-offset={labelOffset === false ? "false" : undefined}
      >
        <label
          data-slot="textarea-label"
          className={[
            styles.label,
            hideLabel ? "kernel-sr-only" : null,
            resolveClassName(labelClassName, state),
          ]
            .filter(Boolean)
            .join(" ")}
          htmlFor={textareaId}
        >
          {label}
          {required ? (
            <span className={styles.required} aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <textarea
          {...rest}
          ref={ref}
          id={textareaId}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          required={required}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          data-slot="textarea-control"
          className={[styles.input, resolveClassName(className, state)]
            .filter(Boolean)
            .join(" ")}
          onChange={(event) => {
            if (value === undefined) setUncontrolledValue(event.target.value);
            setAutofilled(false);
            onChange?.(event);
          }}
          onFocus={(event: FocusEvent<HTMLTextAreaElement>) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event: FocusEvent<HTMLTextAreaElement>) => {
            setFocused(false);
            onBlur?.(event);
          }}
          onAnimationStart={(event) => {
            if (event.animationName.toLowerCase().includes("onautofillstart")) {
              setAutofilled(true);
            }
            onAnimationStart?.(event);
          }}
        />
        {showError ? (
          <p
            data-slot="textarea-error"
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
            data-slot="textarea-description"
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
