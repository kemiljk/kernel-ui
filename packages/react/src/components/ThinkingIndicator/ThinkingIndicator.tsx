import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./ThinkingIndicator.module.css";

export interface ThinkingIndicatorProps {
  /** Real, visible text — not sr-only — same reasoning as Toast: the state
   * should be readable by everyone, not just announced to assistive tech. */
  label?: string;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * The universal "typing indicator" (iMessage, Slack) — three staggered dots
 * next to a visible label. `role="status"` matches Toast's own
 * `default`/`success` case: a non-interrupting, polite live-region update,
 * not urgent enough for `role="alert"`.
 */
export function ThinkingIndicator({ label = "Thinking", className }: ThinkingIndicatorProps) {
  return (
    <span
      role="status"
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      <span className={styles.label}>{label}</span>
      <span className={styles.dots} aria-hidden="true">
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </span>
    </span>
  );
}
