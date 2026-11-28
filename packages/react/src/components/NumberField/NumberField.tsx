import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import type { ChangeDetails, ChangeEventSource } from "../../utils/changeDetails";
import { useControllableStateWithDetails } from "../../utils/useControllableState";
import styles from "./NumberField.module.css";

export interface NumberFieldState {
  invalid: boolean;
  disabled: boolean;
}

/** Built-in strings, overridable for translation via `labels`. */
export interface NumberFieldLabels {
  /** Accessible name of the step-up button. Default `"Increment"`. */
  increment: string;
  /** Accessible name of the step-down button. Default `"Decrement"`. */
  decrement: string;
}

const defaultNumberFieldLabels: NumberFieldLabels = { increment: "Increment", decrement: "Decrement" };

/** What changed a `NumberField`. */
export type NumberFieldChangeReason = "input" | "keyboard" | "wheel" | "step-button";

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
  /** Set to `false` to hard-align the label, description, and error text
   * flush with the field's left edge, undoing the default inset that lines
   * them up with the input's own text padding (`--kernel-label-inset`). */
  labelOffset?: boolean;
  value?: number;
  defaultValue?: number;
  /** Called before the value commits, with the reason: `"input"` (typing),
   * `"keyboard"` (ArrowUp/ArrowDown in the field), `"wheel"` (scrolling over
   * the focused field, where the browser does that) or `"step-button"` (the
   * − / + buttons). `details.cancel()` keeps the committed value. */
  onValueChange?: (value: number | undefined, details: ChangeDetails<NumberFieldChangeReason>) => void;
  min?: number;
  max?: number;
  step?: number;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: ClassNameValue<NumberFieldState>;
  wrapperClassName?: ClassNameValue<NumberFieldState>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<NumberFieldLabels>;
}

/**
 * `TextField`'s exact label/description/error scaffold around a real
 * `<input type="number">` instead of `type="text"` — numeric keypad on
 * mobile, native min/max/step constraint validation, and native
 * ArrowUp/ArrowDown stepping while focused, all for free. The custom
 * − / + buttons alongside it don't reimplement stepping logic: they
 * call the input's own native `stepUp()`/`stepDown()` methods and read
 * `.value` back afterward (those methods change the DOM value directly
 * without dispatching an `input`/`change` event, so this is the one
 * place that has to notice the change by hand). They're excluded from
 * the tab order (`tabIndex={-1}`) because focused ArrowUp/ArrowDown
 * already does the identical thing natively — a fully keyboard-only
 * flow never needs to reach them, so they don't need their own stop.
 * The native spinner arrows are hidden in CSS since these buttons
 * replace them; not a case of two competing steppers. The buttons sit
 * side by side rather than stacked: two stacked buttons share one
 * control height, so neither reaches a 24×24 target, and a stacked
 * column can't nest inside a pill's end cap at a round theme. Side by
 * side, each is a square concentric with the field's corner.
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
      labelOffset = true,
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
      labels,
      ...rest
    },
    ref,
  ) {
    const l = { ...defaultNumberFieldLabels, ...labels };
    const generatedId = useId();
    const inputId = id ?? generatedId;
    const descriptionId = `${inputId}-description`;
    const errorId = `${inputId}-error`;
    const inputRef = useRef<HTMLInputElement>(null);

    const [current, setCurrent] = useControllableStateWithDetails<number | undefined, NumberFieldChangeReason>({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    const [draft, setDraft] = useState(current !== undefined ? String(current) : "");
    const [focused, setFocused] = useState(false);

    useEffect(() => {
      if (!focused) setDraft(current !== undefined ? String(current) : "");
    }, [current, focused]);

    // The input's own `change` can't say whether the browser stepped the
    // value (ArrowUp/Down, wheel) or the user typed it, so the last key or
    // wheel on the field is remembered and read once.
    const pendingReasonRef = useRef<NumberFieldChangeReason>("input");

    function handleChange(raw: string, event: ChangeEventSource) {
      const reason = pendingReasonRef.current;
      pendingReasonRef.current = "input";
      setDraft(raw);
      if (raw === "") {
        setCurrent(undefined, reason, event);
        return;
      }
      const parsed = Number(raw);
      if (!Number.isNaN(parsed)) setCurrent(parsed, reason, event);
    }

    function stepBy(direction: 1 | -1, event: ChangeEventSource) {
      const input = inputRef.current;
      if (!input) return;
      const previous = input.value;
      if (direction === 1) input.stepUp();
      else input.stepDown();
      const committed = setCurrent(input.value === "" ? undefined : Number(input.value), "step-button", event);
      // stepUp()/stepDown() wrote the DOM directly; a vetoed step puts it back.
      if (committed) setDraft(input.value);
      else input.value = previous;
      input.focus();
    }

    const showError = invalid && Boolean(errorMessage);
    // The error replaces the description while it shows, so only one id is
    // ever referenced: pointing at both left a dangling aria-describedby.
    const describedBy = showError ? errorId : description ? descriptionId : undefined;

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
            onChange={(event) => handleChange(event.target.value, event)}
            onKeyDown={(event) => {
              rest.onKeyDown?.(event);
              pendingReasonRef.current =
                event.key === "ArrowUp" || event.key === "ArrowDown" ? "keyboard" : "input";
            }}
            onWheel={(event) => {
              rest.onWheel?.(event);
              pendingReasonRef.current = "wheel";
            }}
            className={[styles.input, resolveClassName(className, state)]
              .filter(Boolean)
              .join(" ")}
          />
          <div className={styles.stepper}>
            {/* − then +, reading in the direction the value moves. */}
            <button
              type="button"
              tabIndex={-1}
              aria-label={l.decrement}
              data-step="down"
              disabled={disabled || atMin}
              onClick={(event) => stepBy(-1, event)}
              className={styles.stepperButton}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path
                  d="M4 8H12"
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
              aria-label={l.increment}
              data-step="up"
              disabled={disabled || atMax}
              onClick={(event) => stepBy(1, event)}
              className={styles.stepperButton}
            >
              <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
                <path
                  d="M4 8H12M8 4V12"
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
