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

const icons: Record<CalloutState["variant"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
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
        {icons[variant]}
      </span>
      <div className={styles.content}>
        {title ? <p className={styles.title}>{title}</p> : null}
        {children ? <div className={styles.body}>{children}</div> : null}
      </div>
    </div>
  );
});
