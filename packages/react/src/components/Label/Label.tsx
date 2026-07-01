import { forwardRef } from "react";
import type { LabelHTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Label.module.css";

export interface LabelProps extends Omit<LabelHTMLAttributes<HTMLLabelElement>, "className"> {
  required?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A standalone `<label>` for cases where a component doesn't build its
 * own (a custom control composed from several elements, for instance).
 * `TextField` and `Checkbox` already render their own, correctly linked,
 * label internally; reach for this one when they don't fit.
 */
export const Label = forwardRef<HTMLLabelElement, LabelProps>(function Label(
  { required = false, children, className, ...rest },
  ref,
) {
  return (
    <label
      {...rest}
      ref={ref}
      className={[styles.root, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    >
      {children}
      {required ? (
        <span className={styles.required} aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
});
