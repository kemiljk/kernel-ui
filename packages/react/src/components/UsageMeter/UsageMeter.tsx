import { forwardRef, useId } from "react";
import type { MeterHTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./UsageMeter.module.css";

export type UsageMeterLevel = "ok" | "warning" | "danger";

export interface UsageMeterState {
  level: UsageMeterLevel;
}

export interface UsageMeterProps
  extends Omit<
    MeterHTMLAttributes<HTMLMeterElement>,
    "className" | "children" | "value" | "min" | "max" | "low" | "high" | "optimum"
  > {
  /** What's being measured, e.g. "Context window" or "Monthly credits".
   * Rendered as a real `<label>` for the meter. */
  label: ReactNode;
  /** Visually hides the label while keeping it as the meter's name. */
  hideLabel?: boolean;
  /** Amount used so far. */
  value: number;
  /** Defaults to `0`. */
  min?: number;
  /** The limit. */
  max: number;
  /** Start of the warning band, passed to the native `<meter>`. */
  low?: number;
  /** End of the comfortable range: above it the meter turns to warning
   * (or danger, when `low` is also set). */
  high?: number;
  /** The best value. Defaults to `min`, because for usage less is
   * better; set it to `max` for a meter where more is better. */
  optimum?: number;
  /** Unit after the numbers, e.g. `"tokens"` or `"credits"`. */
  unit?: string;
  /** BCP 47 locale for number formatting. Defaults to the reader's. */
  locale?: string;
  /** Replaces the default `"12,340 / 200,000 tokens"` text, which is also
   * the meter's `aria-valuetext`. */
  formatValue?: (value: number, max: number) => string;
  /** Helper text under the bar. */
  description?: ReactNode;
  className?: ClassNameValue<UsageMeterState>;
  wrapperClassName?: ClassNameValue<UsageMeterState>;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The HTML spec's own `<meter>` region algorithm (optimum, suboptimum,
 * even less good), so the colour always agrees with what the browser
 * reports, plus one rule of ours: a meter at its limit is `danger`
 * whatever the bands say, because usage that's run out has run out. */
export function usageMeterLevel(options: {
  value: number;
  min?: number;
  max: number;
  low?: number;
  high?: number;
  optimum?: number;
}): UsageMeterLevel {
  const min = options.min ?? 0;
  const max = Math.max(min, options.max);
  const value = clamp(options.value, min, max);
  const low = clamp(options.low ?? min, min, max);
  const high = clamp(options.high ?? max, low, max);
  const optimum = clamp(options.optimum ?? min, min, max);
  let level: UsageMeterLevel;
  if (optimum < low) {
    level = value < low ? "ok" : value <= high ? "warning" : "danger";
  } else if (optimum > high) {
    level = value > high ? "ok" : value >= low ? "warning" : "danger";
  } else {
    level = value >= low && value <= high ? "ok" : "warning";
  }
  if (optimum < max && value >= max && max > min) level = "danger";
  return level;
}

/**
 * Token, credit or quota usage on a real `<meter>`, the HTML element for
 * "a scalar measurement within a known range". Not a `<progress>`: usage
 * isn't a task heading for completion, and `<meter>`'s `low`/`high`/
 * `optimum` attributes already express "this much is fine, this much is a
 * warning". The browser exposes the value to assistive tech itself; the
 * formatted text ("12,340 / 200,000 tokens") is set as `aria-valuetext`
 * so it's read with its unit rather than as a bare percentage, and the
 * visible copy of it is `aria-hidden` so it isn't read twice.
 *
 * The label is a real `<label for>`, since `<meter>` is a labelable
 * element. Numbers are formatted with `Intl.NumberFormat`.
 *
 * Colour follows the same region algorithm the browser uses, so above
 * `high` the bar turns to warning (or danger past both `low` and `high`),
 * and a full meter is always danger. The native bar is restyled with
 * `::-webkit-meter-*` and `::-moz-meter-bar` (there's no standard,
 * unprefixed way yet), reading tokens only.
 */
export const UsageMeter = forwardRef<HTMLMeterElement, UsageMeterProps>(function UsageMeter(
  {
    label,
    hideLabel = false,
    value,
    min = 0,
    max,
    low,
    high,
    optimum,
    unit,
    locale,
    formatValue,
    description,
    className,
    wrapperClassName,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const meterId = id ?? generatedId;
  const descriptionId = `${meterId}-description`;
  const resolvedOptimum = optimum ?? min;
  const level = usageMeterLevel({ value, min, max, low, high, optimum: resolvedOptimum });
  const state: UsageMeterState = { level };

  const numberFormat = new Intl.NumberFormat(locale);
  const valueText = formatValue
    ? formatValue(value, max)
    : `${numberFormat.format(value)} / ${numberFormat.format(max)}${unit ? ` ${unit}` : ""}`;

  return (
    <div
      className={[styles.root, resolveClassName(wrapperClassName, state)]
        .filter(Boolean)
        .join(" ")}
      data-slot="usage-meter"
      data-level={level}
    >
      <div className={styles.header}>
        <label
          htmlFor={meterId}
          className={[styles.label, hideLabel ? "kernel-sr-only" : null].filter(Boolean).join(" ")}
          data-slot="usage-meter-label"
        >
          {label}
        </label>
        <span className={styles.value} aria-hidden="true" data-slot="usage-meter-value">
          {valueText}
        </span>
      </div>
      <meter
        {...rest}
        ref={ref}
        id={meterId}
        min={min}
        max={max}
        value={value}
        low={low}
        high={high}
        optimum={resolvedOptimum}
        aria-valuetext={valueText}
        aria-describedby={description ? descriptionId : undefined}
        data-slot="usage-meter-control"
        className={[styles.meter, resolveClassName(className, state)].filter(Boolean).join(" ")}
      />
      {description ? (
        <p id={descriptionId} className={styles.description} data-slot="usage-meter-description">
          {description}
        </p>
      ) : null}
    </div>
  );
});
