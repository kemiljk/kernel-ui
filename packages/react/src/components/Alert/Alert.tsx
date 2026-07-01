import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Alert.module.css";

export interface AlertState {
  variant: "info" | "success" | "warning" | "danger";
}

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "title"> {
  variant?: AlertState["variant"];
  title?: ReactNode;
  className?: ClassNameValue<AlertState>;
}

const icons: Record<AlertState["variant"], string> = {
  info: "ℹ",
  success: "✓",
  warning: "!",
  danger: "✕",
};

/**
 * There's no `<alert>` element, ARIA live-region roles are the correct
 * tool for exactly this gap: content that should be announced to
 * assistive tech as soon as it appears. `danger`/`warning` interrupt
 * (`role="alert"`, assertive); `info`/`success` wait their turn
 * (`role="status"`, polite), matching how urgently each should interrupt
 * someone using a screen reader.
 */
export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { variant = "info", title, children, className, ...rest },
  ref,
) {
  const state: AlertState = { variant };
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
