import type { LiHTMLAttributes, OlHTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import { Reasoning } from "../Reasoning/Reasoning";
import { ToolCall, type ToolCallStatus } from "../ToolCall/ToolCall";
import styles from "./AgentActivity.module.css";

export interface AgentActivityProps
  extends Omit<OlHTMLAttributes<HTMLOListElement>, "className"> {
  children: ReactNode;
  /** Accessible name for the stream. */
  label?: string;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * One chronological stream of what an agent did: reasoning, searches, tool
 * calls, structured traces, mixed freely.
 *
 * A real `<ol>`, because an activity trace is the one thing where order
 * *is* the content — "it searched, then read the file, then edited it"
 * stops being true if the list reorders.
 *
 * There's deliberately no connector rail down the stream: reasoning and tool
 * steps render their own bordered surfaces, so a spine could only ever be
 * drawn beside some of the steps, and one that appears next to one row and
 * not the next reads as a rendering bug rather than a timeline.
 */
export function AgentActivity({
  children,
  label = "Activity",
  className,
  ...rest
}: AgentActivityProps) {
  return (
    <ol
      {...rest}
      aria-label={label}
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      {children}
    </ol>
  );
}

export type AgentActivityKind = "reasoning" | "search" | "tool" | "trace";
export type AgentActivityStatus = ToolCallStatus;

export interface AgentActivityItemState {
  kind: AgentActivityKind;
  status: AgentActivityStatus;
  open: boolean;
}

export interface AgentActivityItemProps
  extends Omit<LiHTMLAttributes<HTMLLIElement>, "className"> {
  /** Visible one-line description of the step. */
  label: ReactNode;
  kind?: AgentActivityKind;
  status?: AgentActivityStatus;
  /** Detail for the step: a reasoning trace, search results, a tool's
   * output. Omit it and the row is a plain status line. */
  children?: ReactNode;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: ClassNameValue<AgentActivityItemState>;
}

const KIND_ICONS: Record<AgentActivityKind, ReactNode> = {
  reasoning: (
    <>
      <path
        d="M8 1.5a5 5 0 0 0-3 9l.5 3h5l.5-3a5 5 0 0 0-3-9Z"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinejoin="round"
      />
      <path d="M6.25 14.5h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  search: (
    <>
      <circle cx="7" cy="7" r="4.25" stroke="currentColor" strokeWidth="1.25" />
      <path d="M10.25 10.25 13.5 13.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
  tool: (
    <path
      d="M9.5 2.5a3 3 0 0 0 3.75 3.75l-7 7a1.75 1.75 0 0 1-2.5-2.5l7-7A3 3 0 0 0 9.5 2.5Z"
      stroke="currentColor"
      strokeWidth="1.25"
      strokeLinejoin="round"
    />
  ),
  trace: (
    <>
      <path d="M3 4.5h10M3 8h6.5M3 11.5h8.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
    </>
  ),
};

/**
 * One step in the stream.
 *
 * `reasoning` and `tool` steps delegate their body to the existing
 * `Reasoning` and `ToolCall` components rather than reimplementing their
 * disclosure, streaming, and status behaviour — one source of truth for
 * those states, and both components stay exactly as they are for anyone
 * using them standalone. `search` and `trace` steps get this component's
 * own `<details>`, height-animated by the same `DetailsPanelAnimator`.
 */
export function AgentActivityItem({
  label,
  kind = "trace",
  status = "complete",
  children,
  defaultOpen = false,
  open: openProp,
  onOpenChange,
  className,
  ...rest
}: AgentActivityItemProps) {
  const hasBody = children != null && children !== false && children !== true;
  const { detailsRef, contentRef, open } = useDetailsTransition({
    defaultOpen,
    open: openProp,
    onOpenChange,
  });
  const delegates = kind === "reasoning" || kind === "tool";
  const state: AgentActivityItemState = {
    kind,
    status,
    open: delegates ? true : hasBody ? open : false,
  };

  return (
    <li
      {...rest}
      data-kind={kind}
      data-status={status}
      data-delegated={dataAttr(delegates)}
      className={[styles.item, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {delegates ? null : (
        <span className={styles.marker} aria-hidden="true">
          <svg className={styles.icon} viewBox="0 0 16 16" fill="none">
            {KIND_ICONS[kind]}
          </svg>
        </span>
      )}

      {kind === "reasoning" ? (
        <Reasoning streaming={status === "running"} durationLabel={label}>
          {children}
        </Reasoning>
      ) : kind === "tool" ? (
        <ToolCall label={label} status={status}>
          {children}
        </ToolCall>
      ) : hasBody ? (
        <details ref={detailsRef} className={styles.disclosure}>
          <summary className={styles.trigger}>
            <span className={styles.label}>{label}</span>
            <svg className={styles.chevron} viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
      ) : (
        <span className={styles.label} {...(status === "running" ? { role: "status" } : {})}>
          {label}
        </span>
      )}
    </li>
  );
}
