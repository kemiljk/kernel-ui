import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { pillIconAttrs, usePillIconRef } from "../../utils/pillIcons";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
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
 *
 * Shaped like `Button`: an optical pill at a round theme (see `Badge`),
 * so a text label's padding includes the width the end caps cut away
 * and its capitals are centred by cap height. An icon child at either
 * end is found the same way `Badge` finds one (`pillIconAttrs`, then the
 * real DOM) and sits in a 1lh slot concentric with the corner, so an
 * icon-only toggle stays square, or a circle at Round.
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
    children,
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
  const pillRef = usePillIconRef<HTMLButtonElement>();

  return (
    <button
      {...rest}
      {...pillIconAttrs(children)}
      ref={mergeRefs(ref, pillRef)}
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
    >
      {children}
    </button>
  );
});
