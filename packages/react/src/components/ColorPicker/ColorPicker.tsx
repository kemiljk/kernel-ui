import { forwardRef, useEffect, useId, useState } from "react";
import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./ColorPicker.module.css";

export interface ColorPickerState {
  disabled: boolean;
  invalid: boolean;
}

export interface ColorPickerProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "value" | "defaultValue" | "onChange" | "size"
  > {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  /** Always a normalized 7-character lowercase hex string, e.g. `"#3b82f6"`
   * — matches what `<input type="color">` itself always reports, so the
   * value flowing through here is never anything the native element
   * wouldn't already produce on its own. */
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Renders an editable hex text field beside the swatch. Default `true`:
   * the native swatch is the only way to open the OS picker, but it
   * communicates nothing textually and can't be typed into, and typing an
   * exact hex (brand colours, design handoffs) is common enough that it
   * shouldn't require an extra prop most consumers need to discover. */
  showHexInput?: boolean;
  description?: ReactNode;
  errorMessage?: ReactNode;
  /** Set to `false` to hard-align the description and error text flush
   * with the field's left edge, undoing the default inset that lines them
   * up with the swatch/label edge (`--kernel-label-inset`). Doesn't affect
   * `label` itself — it sits above the swatch, not read as text-field
   * content, so it never carries the inset in the first place. */
  labelOffset?: boolean;
  invalid?: boolean;
  size?: "sm" | "md" | "lg";
  className?: ClassNameValue<ColorPickerState>;
  wrapperClassName?: ClassNameValue<ColorPickerState>;
}

const HEX_PATTERN = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parses a hex string a user might type (`"3b82f6"`, `"#fff"`,
 * `"#3B82F6"`) into the same normalized 7-char lowercase form the native
 * colour input reports, or `null` if it doesn't parse. */
function normalizeHex(raw: string): string | null {
  const match = HEX_PATTERN.exec(raw.trim());
  if (!match?.[1]) return null;
  const digits = match[1];
  const expanded =
    digits.length === 3
      ? digits
          .split("")
          .map((digit) => digit + digit)
          .join("")
      : digits;
  return `#${expanded.toLowerCase()}`;
}

/**
 * A real `<input type="color">`. Its native swatch can't be restyled
 * consistently across browsers (Chrome allows a little, Safari almost
 * none), so a purely decorative `<span>` painted from a JS-computed
 * `--swatch-color` custom property sits visually on top — the same
 * compute-in-JS-hand-off-via-custom-property pattern `Slider` uses for
 * `--percent` — while the real, focusable, clickable input sits
 * underneath at `opacity: 0` (never `display: none`, which would drop it
 * from the tab order and break its clickability). Both live inside one
 * real `<label>`, so clicking anywhere on the swatch opens the OS picker
 * with no manual click-forwarding JS. The optional hex field is a second,
 * independently-labelled view onto the same value, not a second source
 * of truth: it only ever commits back through the same `value`.
 */
export const ColorPicker = forwardRef<HTMLInputElement, ColorPickerProps>(
  function ColorPicker(
    {
      label,
      hideLabel = false,
      value,
      defaultValue = "#000000",
      onValueChange,
      showHexInput = true,
      description,
      errorMessage,
      labelOffset = true,
      invalid = false,
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

    const [current, setCurrent] = useControllableState({
      value,
      defaultValue,
      onChange: onValueChange,
    });

    const [draft, setDraft] = useState(current);
    const [hexFocused, setHexFocused] = useState(false);

    // Resync the hex field from the committed value whenever it changes
    // externally — but never while the user is actively typing in it,
    // the same "don't clobber what's mid-edit" rule Combobox follows for
    // its own text input.
    useEffect(() => {
      if (!hexFocused) setDraft(current);
    }, [current, hexFocused]);

    const draftInvalid = draft !== "" && normalizeHex(draft) === null;
    const showError = invalid && Boolean(errorMessage);
    const describedBy =
      [showError ? errorId : null, description ? descriptionId : null]
        .filter(Boolean)
        .join(" ") || undefined;

    const state: ColorPickerState = { disabled, invalid };

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
        </label>
        <div className={styles.controlRow}>
          <label className={styles.swatchLabel} htmlFor={inputId}>
            <span
              className={styles.swatch}
              aria-hidden="true"
              style={{ "--swatch-color": current } as CSSProperties}
            />
            <input
              {...rest}
              ref={ref}
              id={inputId}
              type="color"
              value={current}
              disabled={disabled}
              aria-describedby={describedBy}
              onChange={(event) => setCurrent(event.target.value)}
              className={[styles.input, resolveClassName(className, state)]
                .filter(Boolean)
                .join(" ")}
            />
          </label>
          {showHexInput ? (
            <input
              type="text"
              inputMode="text"
              spellCheck={false}
              maxLength={7}
              value={draft}
              disabled={disabled}
              aria-label="Hex color value"
              aria-invalid={draftInvalid || undefined}
              className={styles.hexInput}
              onFocus={() => setHexFocused(true)}
              onChange={(event) => {
                const next = event.target.value;
                setDraft(next);
                const normalized = normalizeHex(next);
                if (normalized) setCurrent(normalized);
              }}
              onBlur={() => {
                setHexFocused(false);
                if (!normalizeHex(draft)) setDraft(current);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
              }}
            />
          ) : null}
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
