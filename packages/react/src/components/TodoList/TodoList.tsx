import {
  Children,
  isValidElement,
  type HTMLAttributes,
  type LiHTMLAttributes,
  type ReactNode,
} from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import styles from "./TodoList.module.css";

export type TodoStatus = "pending" | "active" | "done" | "error";

export interface TodoListState {
  open: boolean;
  completed: number;
  total: number;
}

export interface TodoListProps
  extends Omit<HTMLAttributes<HTMLDetailsElement>, "className"> {
  children: ReactNode;
  /** Summary text — the plan's title. */
  label?: ReactNode;
  /** Trailing detail on the summary line: a model name, an elapsed time. */
  metadata?: ReactNode;
  /** Completion count. Derived from `TodoItem` children when omitted, which
   * covers the common case of a statically listed plan. */
  completed?: number;
  total?: number;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: ClassNameValue<TodoListState>;
}

/** Counts `TodoItem` children by status so the summary can show "3/5"
 * without the consumer restating what the list already says. Only direct
 * children are inspected — anything deeper is the consumer's own structure,
 * and guessing at it would report numbers that silently disagree with the
 * visible list. Pass `completed`/`total` explicitly for those cases. */
function deriveCounts(children: ReactNode): { completed: number; total: number } {
  let completed = 0;
  let total = 0;
  for (const child of Children.toArray(children)) {
    if (!isValidElement<TodoItemProps>(child)) continue;
    if (child.type !== TodoItem) continue;
    total += 1;
    if (child.props.status === "done") completed += 1;
  }
  return { completed, total };
}

/**
 * An agent's task plan: a `<details>`/`<summary>` wrapping a real `<ol>`.
 *
 * The plan is ordered work, so it's an ordered list — and the disclosure is
 * native, which means the browser owns expand/collapse, keyboard support,
 * and find-in-page expansion. The summary carries the completion count
 * because a collapsed plan whose progress you can't see is a plan you have
 * to expand to learn anything from.
 */
export function TodoList({
  children,
  label = "Plan",
  metadata,
  completed,
  total,
  defaultOpen = true,
  open: openProp,
  onOpenChange,
  className,
  ...rest
}: TodoListProps) {
  const derived = deriveCounts(children);
  const resolvedTotal = total ?? derived.total;
  const resolvedCompleted = completed ?? derived.completed;
  const { detailsRef, contentRef, open } = useDetailsTransition({
    defaultOpen,
    open: openProp,
    onOpenChange,
  });
  const state: TodoListState = {
    open,
    completed: resolvedCompleted,
    total: resolvedTotal,
  };

  return (
    <details
      {...rest}
      ref={detailsRef}
      data-complete={resolvedTotal > 0 && resolvedCompleted === resolvedTotal ? "" : undefined}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <summary className={styles.trigger}>
        <span className={styles.label}>{label}</span>
        {resolvedTotal > 0 ? (
          <span className={styles.count}>
            {resolvedCompleted}/{resolvedTotal}
          </span>
        ) : null}
        {metadata ? <span className={styles.metadata}>{metadata}</span> : null}
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
        <ol className={styles.list}>{children}</ol>
      </div>
    </details>
  );
}

export interface TodoItemState {
  status: TodoStatus;
}

export interface TodoItemProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "className"> {
  children: ReactNode;
  status?: TodoStatus;
  /** Trailing detail for this task: a duration, a file count. */
  metadata?: ReactNode;
  /** Overrides the visually hidden status word announced with the task. */
  statusLabel?: string;
  className?: ClassNameValue<TodoItemState>;
}

const STATUS_WORDS: Record<TodoStatus, string> = {
  pending: "To do",
  active: "In progress",
  done: "Done",
  error: "Failed",
};

/**
 * One task in the plan.
 *
 * All four status marks are rendered at once and cross-faded by CSS on
 * `data-status`, which is what makes a status change read as the same mark
 * morphing rather than one icon being swapped for another — and it means a
 * status update is a single attribute change, with no JS in the transition
 * at all.
 *
 * The status is never icon-only: each item carries its status as real, if
 * visually hidden, text. A shape and a colour are not a label.
 */
export function TodoItem({
  children,
  status = "pending",
  metadata,
  statusLabel,
  className,
  ...rest
}: TodoItemProps) {
  const state: TodoItemState = { status };

  return (
    <li
      {...rest}
      data-status={status}
      className={[styles.item, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <span className={styles.mark} aria-hidden="true">
        <svg className={styles.markLayer} data-kind="pending" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
        </svg>
        <svg className={styles.markLayer} data-kind="active" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
          <circle cx="8" cy="8" r="2.5" fill="currentColor" />
        </svg>
        <svg className={styles.markLayer} data-kind="done" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.75" fill="currentColor" />
          <path
            d="M5.5 8.25 7.25 10l3.25-3.75"
            stroke="var(--kernel-color-canvas)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <svg className={styles.markLayer} data-kind="error" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="5.75" stroke="currentColor" strokeWidth="1.25" />
          <path
            d="M6 6l4 4M10 6l-4 4"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className={styles.text}>{children}</span>
      <span className="kernel-sr-only">{statusLabel ?? STATUS_WORDS[status]}</span>
      {metadata ? <span className={styles.itemMetadata}>{metadata}</span> : null}
    </li>
  );
}
