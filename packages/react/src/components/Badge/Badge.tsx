import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
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
 */
export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { variant = "neutral", className, ...rest },
  ref,
) {
  const state: BadgeState = { variant };
  return (
    <span
      {...rest}
      ref={ref}
      data-variant={variant}
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
