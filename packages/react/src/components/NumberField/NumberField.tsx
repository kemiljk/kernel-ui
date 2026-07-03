import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./NumberField.module.css";

export interface NumberFieldState {
  invalid: boolean;
  disabled: boolean;
}

export interface NumberFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "value" | "defaultValue" | "onChange" | "size"
  > {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  description?: ReactNode;
  errorMessage?: ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number | undefined) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: ClassNameValue<NumberFieldState>;
  wrapperClassName?: ClassNameValue<NumberFieldState>;
}

/**
 * `TextField`'s exact label/description/error scaffold around a real
 * `<input type="number">` instead of `type="text"` — numeric keypad on
 * mobile, native min/max/step constraint validation, and native
 * ArrowUp/ArrowDown stepping while focused, all for free. The custom
 * up/down buttons alongside it don't reimplement stepping logic: they
 * call the input's own native `stepUp()`/`stepDown()` methods and read
 * `.value` back afterward (those methods change the DOM value directly
 * without dispatching an `input`/`change` event, so this is the one
 * place that has to notice the change by hand). They're excluded from
 * the tab order (`tabIndex={-1}`) because focused ArrowUp/ArrowDown
 * already does the identical thing natively — a fully keyboard-only
 * flow never needs to reach them, so they don't need their own stop.
 * The native spinner arrows are hidden in CSS since these buttons
 * replace them; not a case of two competing steppers.
 *
 * `value`/`defaultValue` are numbers, not strings, but typing "-",
 * "1.", or "" are all valid intermediate states of a number a browser
 * lets you type — rejecting or reformatting them on every keystroke
 * would fight the user's typing. Like `ColorPicker`'s hex field, the
 * displayed text is a local, uncontrolled draft that only commits back
 * to the real numeric `value` once it actually parses.
 */
export const NumberField = forwardRef<HTMLInputElement, NumberFieldProps>(
  function NumberField(
    {
      label,
      hideLabel = false,
      description,
      errorMessage,
      value,
      defaultValue,
      onValueChange,
      min,
      max,
      step = 1,
      invalid = false,
      required = false,
      disabled = false,
      size = "md",
      id,
      className,
      wrapperClassName,
      ...rest
    },
    ref,
  ) {
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    const inputRef = useRef<HTMLInputElement>(null);

    const [current, setCurrent] = useControllableState<number | undefined>({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    const [draft, setDraft] = useState(current !== undefined ? String(current) : "");
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      if (!focused) setDraft(current !== undefined ? String(current) : "");
    }, [current, focused]);

    function handleChange(raw: string) {
      setDraft(raw);
      if (raw === "") {
        setCurrent(undefined);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) setCurrent(parsed);
    }

    function stepBy(direction: 1 | -1) {
      const input = inputRef.current;
      if (!input) return;
      if (direction === 1) input.stepUp();
      else input.stepDown();
      setDraft(input.value);
      setCurrent(input.value === "" ? undefined : Number(input.value));
      input.focus();
    }

    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: NumberFieldState = { invalid, disabled };
    const atMax = max != null && current != null && current >= max;
    const atMin = min != null && current != null && current <= min;

    return (
      <div
        className={[styles.root, resolveClassName(wrapperClassName, state)]
          .filter(Boolean)
          .join(" ")}
        data-invalid={dataAttr(invalid)}
        data-disabled={dataAttr(disabled)}
        data-size={size}
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
        <div className={styles.controlRow}>
          <input
            {...rest}
            ref={mergeRefs(ref, inputRef)}
            id={inputId}
            type="number"
            inputMode="decimal"
            min={min}
            max={max}
            step={step}
            disabled={disabled}
            required={required}
            value={draft}
            aria-invalid={invalid || undefined}
            aria-describedby={describedBy}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onChange={(event) => handleChange(event.target.value)}
            className={[styles.input, resolveClassName(className, state)]
              .filter(Boolean)
              .join(" ")}
          />
          <div className={styles.stepper}>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Increment"
              disabled={disabled || atMax}
              onClick={() => stepBy(1)}
              className={styles.stepperButton}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 10L8 6L12 10"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
            <button
              type="button"
              tabIndex={-1}
              aria-label="Decrement"
              disabled={disabled || atMin}
              onClick={() => stepBy(-1)}
              className={styles.stepperButton}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
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
  },
);
