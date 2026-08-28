import { type ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import styles from "./ToolCall.module.css";

export type ToolCallStatus = "pending" | "running" | "complete" | "error";

export interface ToolCallState {
  open: boolean;
  status: ToolCallStatus;
}

export interface ToolCallProps {
  /** Visible status line, e.g. 'Searching "JWT auth…"'. */
  label: ReactNode;
  /** Live progress of the tool invocation. `running` shows shimmering
   * status text; `complete`/`error` settle to a static icon. */
  status?: ToolCallStatus;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Tool results — typically a `Sources` list or plain result rows. When
   * omitted, ToolCall renders as a non-collapsible status row. */
  children?: ReactNode;
  className?: ClassNameValue<ToolCallState>;
}

function StatusIcon({ status }: { status: Exclude<ToolCallStatus, "running"> }) {
  if (status === "complete") {
    return (
      <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
        <path
          d="M5.25 8.25 7 10l3.75-4"
          stroke="currentColor"
          strokeWidth="1.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (status === "error") {
    return (
      <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
        <path d="M8 5v3.5M8 11h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg className={styles.icon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <circle
        cx="8"
        cy="8"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeDasharray="2.5 2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatusLabel({ status, label }: { status: ToolCallStatus; label: ReactNode }) {
  const canLayerLabel = typeof label === "string" || typeof label === "number";

  return (
    <span className={styles.label}>
      <span className={styles.statusSlot} aria-hidden="true">
        <span className={styles.statusLayer} data-kind="running">
          <span className={styles.dots}>
            <span className={styles.dot} />
            <span className={styles.dot} />
            <span className={styles.dot} />
          </span>
        </span>
        <span className={styles.statusLayer} data-kind="pending">
          <StatusIcon status="pending" />
        </span>
        <span className={styles.statusLayer} data-kind="complete">
          <StatusIcon status="complete" />
        </span>
        <span className={styles.statusLayer} data-kind="error">
          <StatusIcon status="error" />
        </span>
      </span>
      {canLayerLabel ? (
        <span className={styles.labelStack}>
          <span
            className={[styles.labelLayer, styles.shimmer].join(" ")}
            data-kind="running"
            aria-hidden="true"
          >
            {label}
          </span>
          <span
            className={[styles.labelLayer, styles.labelText].join(" ")}
            data-kind="settled"
            aria-hidden="true"
          >
            {label}
          </span>
          <span className="kernel-sr-only">{label}</span>
        </span>
      ) : (
        <span
          className={[styles.labelText, status === "running" ? styles.shimmer : null]
            .filter(Boolean)
            .join(" ")}
        >
          {label}
        </span>
      )}
    </span>
  );
}

/**
 * A collapsible agent tool-invocation status — web search, file reads,
 * code runs, and the rest of the mid-conversation "the model is using a
 * tool" surface. Built on `<details>`/`<summary>` like `Reasoning` (not
 * a custom accordion of divs): expand/collapse and keyboard support come
 * from the browser, and the status line stays a real summary even when
 * there are no results to expand into.
 */
export function ToolCall({
  label,
  status = "pending",
  defaultOpen,
  open: openProp,
  onOpenChange,
  children,
  className,
}: ToolCallProps) {
  const hasResults = children != null && children !== false && children !== true;
  const initialOpen = defaultOpen ?? (status === "running" || status === "pending");
  const { detailsRef, contentRef, open, setOpen } = useDetailsTransition({
    defaultOpen: initialOpen,
    open: openProp,
    onOpenChange,
  });
  const state: ToolCallState = { open, status };

  const summaryBody = <StatusLabel status={status} label={label} />;

  if (!hasResults) {
    return (
      <div
        role="status"
        data-status={status}
        className={[styles.root, styles.static, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" ")}
      >
        {summaryBody}
      </div>
    );
  }

  return (
    <details
      ref={detailsRef}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
      data-status={status}
    >
      <summary className={styles.trigger}>
        <span role={status === "running" ? "status" : undefined}>{summaryBody}</span>
        <svg
          className={styles.chevron}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>
      <div ref={contentRef} className={styles.content}>
        {children}
      </div>
    </details>
  );
}
