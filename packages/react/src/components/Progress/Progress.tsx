import { forwardRef } from "react";
import type { ProgressHTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Progress.module.css";

export interface ProgressProps
  extends Omit<ProgressHTMLAttributes<HTMLProgressElement>, "className"> {
  label?: string;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A real `<progress>`. It's an "indeterminate" spinner for free when you
 * omit `value`, and it reports its own value to assistive tech without
 * any `role="progressbar"`/`aria-valuenow` bookkeeping.
 *
 * Styling its fill has no standardised, non-vendor-prefixed API yet, so
 * `::-webkit-progress-value` and `::-moz-progress-bar` (below) are the
 * correct, current way to do it, not a legacy fallback.
 */
export const Progress = forwardRef<HTMLProgressElement, ProgressProps>(
  function Progress({ label, className, max = 100, ...rest }, ref) {
    return (
      <progress
        {...rest}
        ref={ref}
        max={max}
        aria-label={label}
        className={[styles.root, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);
