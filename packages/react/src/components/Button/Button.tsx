import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  dataAttr,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import styles from "./Button.module.css";

export interface ButtonState {
  variant: "primary" | "secondary" | "ghost" | "danger";
  size: "sm" | "md" | "lg";
  disabled: boolean;
  loading: boolean;
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  /** Visual role of the button. Defaults to `secondary`. */
  variant?: ButtonState["variant"];
  /** Defaults to `md`. */
  size?: ButtonState["size"];
  /** Shows a spinner and marks the button `aria-disabled` and `aria-busy`
   * without changing its layout width. */
  loading?: boolean;
  /** Icon (or any node) placed before the label. */
  iconStart?: ReactNode;
  /** Icon (or any node) placed after the label. */
  iconEnd?: ReactNode;
  className?: ClassNameValue<ButtonState>;
  /** Render as a different element, e.g. an anchor styled as a button.
   * The default is a real `<button type="button">`. */
  render?: RenderProp<ButtonState>;
  /** Overrides the default `data-slot="button"` composition hook. A component
   * that renders a Button as one of its own named parts sets this so its slot
   * name is the one consumers can select (`Dialog`'s close control is
   * `dialog-close`, not `button`) — matching what the same component's Custom
   * Element already emits. Declared explicitly because it can't just ride in
   * with the rest of the props: the default below is applied after the spread,
   * so it would otherwise win. */
  "data-slot"?: string;
}

/**
 * A real `<button>`. Renders as one by default because that's the only
 * element that gets click, keyboard (Space/Enter), focus, and form
 * association for free from the browser. Use `render` when the action
 * navigates, so it should be an `<a>` instead.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      loading = false,
      disabled = false,
      iconStart,
      iconEnd,
      className,
      render,
      type = "button",
      children,
      "data-slot": dataSlot = "button",
      ...rest
    },
    ref,
  ) {
    const state: ButtonState = {
      variant,
      size,
      disabled: Boolean(disabled),
      loading,
    };

    const isDisabled = disabled || loading;

    // A real <button> gets the native `disabled` attribute, which is the
    // only thing that reliably blocks click, keyboard activation, and
    // form submission at once. `render` swaps in an arbitrary element
    // (often an <a>, which has no `disabled` semantics), so in that case
    // fall back to `aria-disabled`, drop it from the tab order, and
    // swallow the click ourselves instead of emitting an invalid
    // `disabled` attribute on a non-form element.
    const interactionProps: Record<string, unknown> = render
      ? {
          "aria-disabled": isDisabled || undefined,
          tabIndex: isDisabled ? -1 : rest.tabIndex,
          onClick: isDisabled
            ? (event: { preventDefault: () => void }) => event.preventDefault()
            : rest.onClick,
        }
      : {
          type,
          disabled: isDisabled,
        };

    return renderElement(
      render,
      "button",
      {
        ...rest,
        ...interactionProps,
        ref,
        "aria-busy": loading || undefined,
        className: [styles.root, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" "),
        "data-slot": dataSlot,
        "data-variant": variant,
        "data-size": size,
        "data-loading": dataAttr(loading),
        children: (
          <>
            {iconStart ? (
              <span className={styles.icon} aria-hidden="true">
                {iconStart}
              </span>
            ) : null}
            {children ? <span className={styles.label}>{children}</span> : null}
            {iconEnd ? (
              <span className={styles.icon} aria-hidden="true">
                {iconEnd}
              </span>
            ) : null}
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : null}
          </>
        ),
      },
      state,
    );
  },
);
