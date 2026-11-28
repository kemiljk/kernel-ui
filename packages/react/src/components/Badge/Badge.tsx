import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { pillIconAttrs } from "../../utils/pillIcons";
import styles from "./Badge.module.css";

export interface BadgeState {
  variant: "neutral" | "accent" | "success" | "warning" | "danger";
}

export interface BadgeProps extends Omit<HTMLAttributes<HTMLSpanElement>, "className"> {
  variant?: BadgeState["variant"];
  className?: ClassNameValue<BadgeState>;
}

/**
 * A small status chip. There's no HTML element for "badge", `<span>` is
 * the correct choice for an inline, semantically neutral run of text
 * that only needs presentational styling.
 *
 * Shaped as an optical pill: its radius follows `--kernel-radius-control`
 * but stops at a true half-height pill, its inline padding grows by the
 * width the end caps cut away, and an icon at either end (an `svg`,
 * `img`, icon component or `data-icon` element) becomes a `1lh` box
 * that sits concentric with the cap. Put icons and text straight inside;
 * no wrapper needed. See `Badge.module.css` for the maths.
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "neutral", className, ...rest },
  ref,
) {
  const state: BadgeState = { variant };
  return (
    <span
      {...pillIconAttrs(rest.children)}
      {...rest}
      ref={ref}
      data-variant={variant}
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
