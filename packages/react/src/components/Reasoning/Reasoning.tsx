import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import { ThinkingIndicator } from "../ThinkingIndicator/ThinkingIndicator";
import styles from "./Reasoning.module.css";

export interface ReasoningState {
  open: boolean;
  streaming: boolean;
}

export interface ReasoningProps {
  /** Auto-opens the trace while true; auto-closes it the moment it flips
   * back to false. Only forces `open` on that transition's edge — once
   * streaming ends, the user's own manual open/close via the summary is
   * left alone, same as native `<details>`. */
  streaming?: boolean;
  /** Consumer-computed, e.g. "Thought for 4s" — shown once streaming ends. */
  durationLabel?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  className?: ClassNameValue<ReasoningState>;
}

/**
 * A collapsible AI reasoning/thinking trace. Its own `<details>`/`<summary>`
 * rather than a wrapped `AccordionItem`: Accordion's `name`-based
 * single/multiple group-exclusivity doesn't apply to a standalone trace, and
 * wrapping it would just be dead API surface to opt out of.
 */
export function Reasoning({
  streaming = false,
  durationLabel,
  defaultOpen = false,
  children,
  className,
}: ReasoningProps) {
  const { detailsRef, contentRef, open, setOpen } = useDetailsTransition({
    defaultOpen: defaultOpen || streaming,
  });
  const wasStreaming = useRef(streaming);
  const state: ReasoningState = { open, streaming };

  // Force `open` only on the streaming true→false / false→true edge, not on
  // every render — otherwise a user who manually collapsed a still-streaming
  // trace would have it forced back open on the next re-render.
  //
  // The false edge (streaming just finished) gets a brief pause before
  // collapsing, the true edge doesn't: opening should feel instant and
  // responsive to "reasoning has started", but auto-collapsing the exact
  // instant streaming ends reads as the trace being yanked away before
  // anyone can register it finished. The summary swaps to the static
  // icon/durationLabel immediately either way (it reads `streaming`
  // directly, not this delayed `open` state) — so during the pause the
  // user sees the completed status appear while the trace is still open,
  // then it settles closed a beat later.
  useEffect(() => {
    if (wasStreaming.current === streaming) return;
    wasStreaming.current = streaming;
    if (streaming) {
      setOpen(true);
      return;
    }
    const timer = window.setTimeout(() => setOpen(false), 600);
    return () => window.clearTimeout(timer);
  }, [streaming, setOpen]);

  return (
    <details
      ref={detailsRef}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <summary className={styles.trigger}>
        {streaming ? (
          <ThinkingIndicator label="Thinking" />
        ) : (
          <span className={styles.label}>
            <svg
              className={styles.icon}
              viewBox="0 0 16 16"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M8 1.5a5 5 0 0 0-3 9l.5 3h5l.5-3a5 5 0 0 0-3-9Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinejoin="round"
              />
              <path d="M6.25 14.5h3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
            </svg>
            {durationLabel ?? "Reasoning"}
          </span>
        )}
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
