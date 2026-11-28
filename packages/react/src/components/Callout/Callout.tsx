import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Callout.module.css";

export interface CalloutState {
  variant: "info" | "success" | "warning" | "danger";
}

export interface CalloutProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "title"> {
  variant?: CalloutState["variant"];
  title?: ReactNode;
  className?: ClassNameValue<CalloutState>;
}

/** Stroke icons drawn at 16px, one per variant: a circle for info, success
 * and danger, a triangle for warning (the shape itself signals caution
 * before the glyph inside is read). Hand-authored like the library's other
 * icons, so they don't depend on which font renders a "ℹ" or "✕". */
const iconPaths: Record<CalloutState["variant"], string[]> = {
  info: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M8 7.25V11", "M8 5H8.01"],
  success: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M5.5 8.25L7.25 10L10.5 6.25"],
  warning: ["M8 2.25L14.25 13.25H1.75L8 2.25Z", "M8 6.5V9", "M8 11.25H8.01"],
  danger: ["M14.25 8A6.25 6.25 0 1 1 1.75 8A6.25 6.25 0 1 1 14.25 8Z", "M6 6L10 10M10 6L6 10"],
};

/**
 * There's no `<callout>` element, ARIA live-region roles are the correct
 * tool for exactly this gap: content that should be announced to
 * assistive tech as soon as it appears. `danger`/`warning` interrupt
 * (`role="alert"`, assertive); `info`/`success` wait their turn
 * (`role="status"`, polite), matching how urgently each should interrupt
 * someone using a screen reader.
 */
export const Callout = forwardRef<HTMLDivElement, CalloutProps>(function Callout(
  { variant = "info", title, children, className, ...rest },
  ref,
) {
  const state: CalloutState = { variant };
  const isUrgent = variant === "danger" || variant === "warning";

  return (
    <div
      {...rest}
      ref={ref}
      role={isUrgent ? "alert" : "status"}
      data-variant={variant}
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
    >
      <span className={styles.icon} aria-hidden="true">
        <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
          {iconPaths[variant].map((d) => (
            <path
              key={d}
              d={d}
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
        </svg>
      </span>
      <div className={styles.content}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
    </div>
  );
});
