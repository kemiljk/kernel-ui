import { forwardRef } from "react";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import {
  dataAttr,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import { pillIconAttrs } from "../../utils/pillIcons";
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
  /** Icon placed before the label: any `svg`, `img` or icon component.
   * It's drawn at `--kernel-icon-size` in a slot concentric with the
   * button's corner. With no label (or a lone icon as `children`) the
   * button is icon-only: square, or a circle at Round. Pass icon components
   * here rather than as children: a lone `svg`/`img` child is also treated
   * as icon-only, but a component child is always treated as the label. */
  iconStart?: ReactNode;
  /** Icon placed after the label. Same sizing as `iconStart`. */
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
 *
 * Optically padded like `Badge`: the radius stops at half the control
 * height (a true pill at Round), inline padding grows by the width the
 * corners cut away, icons sit concentric with the corner, and the
 * capitals are centred by cap height rather than by the font's line box.
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

    // A lone svg/img (or data-icon element) passed as children is an
    // icon-only button, the same as `iconStart` with no label. Only what is
    // *certainly* an icon at render: a component child might render text
    // (<Trans>, an Astro slot), and promoting it would aria-hide the label.
    // Pass component icons through iconStart/iconEnd.
    const loneIcon =
      !iconStart && !iconEnd && children != null
        ? pillIconAttrs(children)
        : {};
    const leading = iconStart ?? (loneIcon["data-icon-start"] && loneIcon["data-icon-end"] ? children : null);
    const label = leading === children ? null : children;
    // An icon with no label is both the first and last thing in the
    // button, so it takes both edge pulls and lands concentric.
    const hasStart = Boolean(leading) || (Boolean(iconEnd) && !label);
    const hasEnd = Boolean(iconEnd) || (Boolean(leading) && !label);

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
        "data-icon-start": dataAttr(hasStart),
        "data-icon-end": dataAttr(hasEnd),
        children: (
          <>
            {leading ? (
              <span className={styles.icon} aria-hidden="true">
                {leading}
              </span>
            ) : null}
            {label ? <span className={styles.label}>{label}</span> : null}
            {iconEnd ? (
              <span className={styles.icon} aria-hidden="true">
                {iconEnd}
              </span>
            ) : null}
            {loading ? (
              <span className={styles.spinner} aria-hidden="true" data-kernel-motion="essential" />
            ) : null}
          </>
        ),
      },
      state,
    );
  },
);
