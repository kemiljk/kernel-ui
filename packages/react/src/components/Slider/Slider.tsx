import { forwardRef, useEffect, useId, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Slider.module.css";

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "value" | "defaultValue" | "onChange"
  > {
  label: ReactNode;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Shows the current numeric value next to the label. */
  showValue?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A real `<input type="range">`. Dragging, arrow-key stepping, Page
 * Up/Down, Home/End, and touch support are all native. The filled
 * portion of the track has no standardised styling API yet, so this
 * computes the percentage in JS and feeds it back in as a CSS custom
 * property (`--percent`), which the vendor-prefixed track/thumb
 * pseudo-elements in the stylesheet read from, that hand-off is the only
 * JavaScript involved.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    label,
    value,
    defaultValue = 0,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = false,
    id,
    className,
    ...rest
  },
  ref,
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const generatedId = useId();
  const sliderId = id ?? generatedId;

  const [current, setCurrent] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  useEffect(() => {
    const percent = ((current - min) / (max - min)) * 100;
    inputRef.current?.style.setProperty("--percent", `${percent}%`);
  }, [current, min, max]);

  return (
    <div className={styles.root}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={sliderId}>
          {label}
        </label>
        {showValue ? <span className={styles.value}>{current}</span> : null}
      </div>
      <input
        {...rest}
        ref={mergeRefs(ref, inputRef)}
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(event) => setCurrent(Number(event.target.value))}
        className={[styles.input, resolveClassName(className, {})].filter(Boolean).join(" ")}
      />
    </div>
  );
});
