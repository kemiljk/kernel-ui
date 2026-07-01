import { useSyncExternalStore } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { dismissToast, getToastSnapshot, subscribeToasts, toast } from "./toastStore";
import styles from "./Toast.module.css";

export { toast };
export type { ToastOptions, ToastVariant } from "./toastStore";

export interface ToastViewportProps {
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * Mount once, anywhere (the end of your root layout is typical). Every
 * toast renders as its own live region: `danger`/`warning` use
 * `role="alert"` (assertive), `default`/`success` use `role="status"`
 * (polite), the same reasoning as `Alert`.
 */
export function ToastViewport({ className }: ToastViewportProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);

  if (toasts.length === 0) return null;

  return (
    <div
      className={[styles.viewport, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      {toasts.map((item) => {
        const isUrgent = item.variant === "danger" || item.variant === "warning";
        return (
          <div
            key={item.id}
            role={isUrgent ? "alert" : "status"}
            data-variant={item.variant}
            data-closing={dataAttr(item.closing)}
            className={styles.toast}
          >
            <div className={styles.content}>
              <p className={styles.title}>{item.title}</p>
              {item.description ? <p className={styles.description}>{item.description}</p> : null}
            </div>
            <button
              type="button"
              aria-label="Dismiss"
              className={styles.close}
              onClick={() => dismissToast(item.id)}
            >
              <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="14" height="14">
                <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
