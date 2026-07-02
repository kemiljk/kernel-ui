import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { ThinkingIndicator } from "../ThinkingIndicator/ThinkingIndicator";
import styles from "./Reasoning.module.css";

/** Same capability check as Accordion, same reason: only browsers that
 * actually animate `::details-content` should ever get the transient
 * data-state used to block text-selection mid-resize. */
const supportsAnimatedDetails =
  typeof CSS !== "undefined" && CSS.supports("selector(::details-content)");

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
  const [open, setOpen] = useState(defaultOpen || streaming);
  const [transitioning, setTransitioning] = useState(false);
  const detailsRef = useRef<HTMLDetailsElement>(null);
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
  }, [streaming]);

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

  return (
    <details
      ref={detailsRef}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
      open={open}
      data-state={transitioning ? (open ? "opening" : "closing") : undefined}
      onToggle={(event) => {
        setOpen(event.currentTarget.open);
        if (supportsAnimatedDetails) setTransitioning(true);
      }}
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
      <div className={styles.content}>{children}</div>
    </details>
  );
}
