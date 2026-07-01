import { forwardRef, useId } from "react";
import type { TextareaHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Textarea.module.css";

export interface TextareaState {
  invalid: boolean;
  disabled: boolean;
  required: boolean;
}

export interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  label: ReactNode;
  description?: ReactNode;
  errorMessage?: ReactNode;
  invalid?: boolean;
  className?: ClassNameValue<TextareaState>;
}

/**
 * A real `<textarea>` that grows with its content via
 * `field-sizing: content` instead of a `scrollHeight`-measuring resize
 * listener. Same label/description/error wiring as `TextField`.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      label,
      description,
      errorMessage,
      invalid = false,
      required = false,
      disabled = false,
      id,
      className,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const textareaId = id ?? generatedId;
    const descriptionId = `${textareaId}-description`;
    const errorId = `${textareaId}-error`;

    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: TextareaState = { invalid, disabled, required };

    return (
      <div
        className={styles.root}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
      >
        <label className={styles.label} htmlFor={textareaId}>
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
