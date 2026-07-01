import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Toggle.module.css";

export interface ToggleState {
  pressed: boolean;
  disabled: boolean;
}

export interface ToggleProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "onChange"> {
  pressed?: boolean;
  defaultPressed?: boolean;
  onPressedChange?: (pressed: boolean) => void;
  size?: "sm" | "md" | "lg";
  className?: ClassNameValue<ToggleState>;
}

/**
 * A real `<button aria-pressed>`, the WAI-ARIA pattern for a two-state
 * toggle that looks and behaves like a button (a toolbar "bold" button,
 * say), as distinct from `Switch`, which is the pattern for an on/off
 * setting.
 */
export const Toggle = forwardRef<HTMLButtonElement, ToggleProps>(function Toggle(
  {
    pressed,
    defaultPressed = false,
    onPressedChange,
    size = "md",
    disabled = false,
    className,
    onClick,
    ...rest
  },
  ref,
) {
  const [isPressed, setPressed] = useControllableState({
    value: pressed,
    defaultValue: defaultPressed,
    onChange: onPressedChange,
  });

  const state: ToggleState = { pressed: isPressed, disabled };

  return (
    <button
      {...rest}
      ref={ref}
      type="button"
      aria-pressed={isPressed}
      disabled={disabled}
      data-size={size}
      data-state={isPressed ? "on" : "off"}
      data-disabled={dataAttr(disabled)}
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) setPressed(!isPressed);
      }}
    />
  );
});
