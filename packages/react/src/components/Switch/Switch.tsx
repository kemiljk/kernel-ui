import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Switch.module.css";

export interface SwitchState {
  checked: boolean;
  disabled: boolean;
}

export interface SwitchProps
  extends Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    "className" | "onChange" | "children"
  > {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  children?: ReactNode;
  className?: ClassNameValue<SwitchState>;
}

/**
 * There's no native "switch" element yet, so this follows the WAI-ARIA
 * switch pattern: a real `<button>` (so click, Space/Enter, and focus are
 * free) with `role="switch"` and `aria-checked` telling assistive tech
 * it's a two-state toggle, not a regular button. Wrapping it in a
 * `<label>` works because `button` is a labelable element, exactly like
 * `input`.
 */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(
  function Switch(
    {
      checked,
      defaultChecked = false,
      onCheckedChange,
      disabled = false,
      children,
      className,
      ...rest
    },
    ref,
  ) {
    const [isChecked, setChecked] = useControllableState({
      value: checked,
      defaultValue: defaultChecked,
      onChange: onCheckedChange,
    });

    const state: SwitchState = { checked: isChecked, disabled };

    const control = (
      <button
        {...rest}
        ref={ref}
        type="button"
        role="switch"
        aria-checked={isChecked}
        disabled={disabled}
        data-state={isChecked ? "checked" : "unchecked"}
        data-disabled={dataAttr(disabled)}
        className={[styles.control, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" ")}
        onClick={(event) => {
          rest.onClick?.(event);
          if (!event.defaultPrevented) setChecked(!isChecked);
        }}
      >
        <span className={styles.thumb} />
      </button>
    );

    if (!children) return control;

    return (
      <label className={styles.root} data-disabled={dataAttr(disabled)}>
        <span className={styles.label}>{children}</span>
        {control}
      </label>
    );
  },
);
