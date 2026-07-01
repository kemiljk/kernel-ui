import { forwardRef, useEffect, useRef } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Checkbox.module.css";

export interface CheckboxState {
  checked: boolean;
  indeterminate: boolean;
  disabled: boolean;
}

export interface CheckboxProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "checked" | "defaultChecked" | "onChange" | "type"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  /** A checkbox can be neither on nor off, e.g. a "select all" checkbox
   * when only some children are selected. This sets the `indeterminate`
   * DOM property (there is no HTML attribute for it) so `:indeterminate`
   * in CSS works without any data-attribute bookkeeping. */
  indeterminate?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Label text. Wrapping the real input in a real `<label>` means
   * clicking the text toggles the box, for free. */
  children?: ReactNode;
  className?: ClassNameValue<CheckboxState>;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  function Checkbox(
    {
      checked,
      defaultChecked = false,
      indeterminate = false,
      onCheckedChange,
      disabled = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [isChecked, setChecked] = useControllableState({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    useEffect(() => {
      if (inputRef.current) inputRef.current.indeterminate = indeterminate;
    }, [indeterminate]);

    const state: CheckboxState = { checked: isChecked, indeterminate, disabled };

    return (
      <label
        className={[styles.root, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" ")}
        data-disabled={dataAttr(disabled)}
      >
        <input
          {...rest}
          ref={mergeRefs(ref, inputRef)}
          type="checkbox"
          className={styles.input}
          checked={isChecked}
          disabled={disabled}
          onChange={(event) => setChecked(event.target.checked)}
        />
        <span className={styles.control} aria-hidden="true">
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none">
            <path
              className={styles.checkmark}
              d="M3.5 8.5L6.5 11.5L12.5 4.5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
            />
            <rect
              className={styles.dash}
              x="3.5"
              y="7.25"
              width="9"
              height="1.5"
              rx="0.75"
              fill="currentColor"
            />
          </svg>
        </span>
        {children ? <span className={styles.label}>{children}</span> : null}
      </label>
    );
  },
);
