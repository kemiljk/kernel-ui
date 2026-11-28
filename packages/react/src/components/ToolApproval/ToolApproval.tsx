import { forwardRef, useEffect, useId, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import { Button } from "../Button/Button";
import styles from "./ToolApproval.module.css";

export type ToolApprovalStatus = "pending" | "approved" | "denied";

export interface ToolApprovalLabels {
  /** Approve button. Defaults to "Approve". */
  approve: ReactNode;
  /** Deny button. Defaults to "Deny". */
  deny: ReactNode;
  /** Always-allow button, shown only with `onAlwaysAllow`. Defaults to
   * "Always allow". */
  alwaysAllow: ReactNode;
  /** Status line after approval. Defaults to "Approved". */
  approved: ReactNode;
  /** Status line after "Always allow". Defaults to "Always allowed". */
  alwaysAllowed: ReactNode;
  /** Status line after denial. Defaults to "Denied". */
  denied: ReactNode;
}

export interface ToolApprovalState {
  status: ToolApprovalStatus;
}

export interface ToolApprovalProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "title"> {
  /** The tool's name, e.g. `"bash"` or `"github.create_issue"`. Shown in
   * monospace in the heading. */
  tool: ReactNode;
  /** Replaces the whole heading. Defaults to "Allow `{tool}` to run?". */
  title?: ReactNode;
  /** Which heading element the title renders as. Defaults to `3`. */
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6;
  /** Controlled decision. `pending` shows the actions; `approved` and
   * `denied` replace them with a status line. */
  status?: ToolApprovalStatus;
  /** Initial decision when uncontrolled. Defaults to `pending`. */
  defaultStatus?: ToolApprovalStatus;
  /** Fires with the new status whenever a button is pressed. */
  onStatusChange?: (status: ToolApprovalStatus) => void;
  onApprove?: () => void;
  onDeny?: () => void;
  /** When provided, adds an "Always allow" button. Pressing it approves
   * (status becomes `approved`) and calls this instead of `onApprove`. */
  onAlwaysAllow?: () => void;
  /** Override any button or status text, e.g. for localisation. */
  labels?: Partial<ToolApprovalLabels>;
  /** What the tool will do: a summary sentence, its arguments, a
   * `CodeBlock` of the command. */
  children?: ReactNode;
  className?: ClassNameValue<ToolApprovalState>;
}

const DEFAULT_LABELS: ToolApprovalLabels = {
  approve: "Approve",
  deny: "Deny",
  alwaysAllow: "Always allow",
  approved: "Approved",
  alwaysAllowed: "Always allowed",
  denied: "Denied",
};

function ShieldIcon() {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path
        d="M8 1.75 13.25 3.5v4.25c0 3.1-2.2 5.5-5.25 6.5-3.05-1-5.25-3.4-5.25-6.5V3.5L8 1.75Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function DecisionIcon({ status }: { status: ToolApprovalStatus }) {
  if (status === "denied") {
    return (
      <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
        <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.25" />
        <path d="M6 6l4 4M10 6l-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
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

/**
 * The prompt an agent shows before it runs a tool: which tool, what it
 * will do, and Approve / Deny (optionally "Always allow"). It's a
 * `<section role="group">` named by its own real heading rather than a
 * landmark region, because a long agent transcript can hold dozens of
 * these and a region each would flood the landmark list. Not a `<form>`:
 * nothing is submitted to a URL, and each choice is a single press.
 *
 * The actions are real Kernel `Button`s. Once a decision is made they're
 * replaced by a status line inside a `role="status"` live region that is
 * rendered from the start (a live region only announces changes made
 * after it exists), so the outcome is announced politely. If focus was
 * on a button that just disappeared, it moves to the status line rather
 * than falling back to the document body.
 *
 * Shaped as a container: `--kernel-radius-container` with
 * `--kernel-padding-container-curve` wherever content meets a corner,
 * which also gives the buttons in the bottom corners their clearance.
 */
export const ToolApproval = forwardRef<HTMLElement, ToolApprovalProps>(function ToolApproval(
  {
    tool,
    title,
    headingLevel = 3,
    status: statusProp,
    defaultStatus = "pending",
    onStatusChange,
    onApprove,
    onDeny,
    onAlwaysAllow,
    labels: labelOverrides,
    children,
    className,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const titleId = `${baseId}-title`;
  const labels = { ...DEFAULT_LABELS, ...labelOverrides };
  const [status, setStatus] = useControllableState<ToolApprovalStatus>({
    value: statusProp,
    defaultValue: defaultStatus,
    onChange: onStatusChange,
  });
  const [alwaysAllowed, setAlwaysAllowed] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLParagraphElement>(null);
  const restoreFocus = useRef(false);
  const Heading = `h${headingLevel}` as "h3";
  const state: ToolApprovalState = { status };

  useEffect(() => {
    if (status === "pending") setAlwaysAllowed(false);
    if (status !== "pending" && restoreFocus.current) {
      restoreFocus.current = false;
      statusRef.current?.focus();
    }
  }, [status]);

  function decide(next: Exclude<ToolApprovalStatus, "pending">, always = false) {
    restoreFocus.current = Boolean(
      actionsRef.current && actionsRef.current.contains(document.activeElement),
    );
    setAlwaysAllowed(always);
    setStatus(next);
    if (next === "denied") onDeny?.();
    else if (always) onAlwaysAllow?.();
    else onApprove?.();
  }

  const statusText =
    status === "denied"
      ? labels.denied
      : status === "approved"
        ? alwaysAllowed
          ? labels.alwaysAllowed
          : labels.approved
        : null;

  return (
    <section
      {...rest}
      ref={ref}
      id={id}
      role="group"
      aria-labelledby={titleId}
      data-slot="tool-approval"
      data-status={status}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <div className={styles.header}>
        <span className={styles.icon}>
          <ShieldIcon />
        </span>
        <Heading id={titleId} className={styles.title} data-slot="tool-approval-title">
          {title ?? (
            <>
              Allow <code className={styles.tool}>{tool}</code> to run?
            </>
          )}
        </Heading>
      </div>
      {children != null && children !== false ? (
        <div className={styles.body} data-slot="tool-approval-body">
          {children}
        </div>
      ) : null}
      <div className={styles.footer}>
        {/* Always mounted, empty while pending: a live region only
            announces changes made after it's in the accessibility tree. */}
        <p
          ref={statusRef}
          role="status"
          tabIndex={-1}
          className={styles.status}
          data-slot="tool-approval-status"
        >
          {statusText != null ? (
            <>
              <span className={styles.statusIcon}>
                <DecisionIcon status={status} />
              </span>
              {statusText}
            </>
          ) : null}
        </p>
        {status === "pending" ? (
          <div ref={actionsRef} className={styles.actions} data-slot="tool-approval-actions">
            {onAlwaysAllow ? (
              <Button
                variant="ghost"
                size="sm"
                className={styles.alwaysAllow}
                onClick={() => decide("approved", true)}
              >
                {labels.alwaysAllow}
              </Button>
            ) : null}
            {/* Deny and Approve wrap as a pair, so a narrow prompt never
                strands Approve on a line of its own. */}
            <div className={styles.decision}>
              <Button variant="secondary" size="sm" onClick={() => decide("denied")}>
                {labels.deny}
              </Button>
              <Button variant="primary" size="sm" onClick={() => decide("approved")}>
                {labels.approve}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
});
