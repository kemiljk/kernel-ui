import { useEffect, useRef, useState, type ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./ToolCall.module.css";

/** Same capability check as Accordion/Reasoning. */
const supportsAnimatedDetails =
  typeof CSS !== "undefined" && CSS.supports("selector(::details-content)");

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
  if (status === "running") {
    return (
      <span className={styles.label}>
        <span className={styles.dots} aria-hidden="true">
          <span className={styles.dot} />
          <span className={styles.dot} />
          <span className={styles.dot} />
        </span>
        <span className={styles.shimmer}>{label}</span>
      </span>
    );
  }
  return (
    <span className={styles.label}>
      <StatusIcon status={status} />
      <span className={styles.labelText}>{label}</span>
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
  const [uncontrolledOpen, setUncontrolledOpen] = useState(initialOpen);
  const isControlled = openProp !== undefined;
  const open = isControlled ? openProp : uncontrolledOpen;
  const [transitioning, setTransitioning] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const state: ToolCallState = { open, status };

  function setOpen(next: boolean) {
    if (!isControlled) setUncontrolledOpen(next);
    onOpenChange?.(next);
  }

  useEffect(() => {
    if (!transitioning) return;
    const node = detailsRef.current;
    if (!node) return;
    const durationMs =
      parseFloat(getComputedStyle(node).getPropertyValue("--kernel-duration-base")) || 200;
    const timer = window.setTimeout(() => setTransitioning(false), durationMs);
    function handleTransitionEnd(event: TransitionEvent) {
      if (event.propertyName === "height") setTransitioning(false);
    }
    node.addEventListener("transitionend", handleTransitionEnd);
    return () => {
      window.clearTimeout(timer);
      node.removeEventListener("transitionend", handleTransitionEnd);
    };
  }, [transitioning]);

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
      open={open}
      data-status={status}
      data-state={transitioning ? (open ? "opening" : "closing") : undefined}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (supportsAnimatedDetails) setTransitioning(true);
      }}
    >
      <summary className={styles.trigger}>
        {status === "running" ? <span role="status">{summaryBody}</span> : summaryBody}
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
      <div className={styles.content}>{children}</div>
    </details>
  );
}
