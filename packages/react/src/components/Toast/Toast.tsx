import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import {
  dismissToast,
  getToastSnapshot,
  pauseAllToasts,
  resumeAllToasts,
  subscribeToasts,
  toast,
  type ToastRecord,
} from "./toastStore";
import { attachToastSwipe } from "./toastSwipe";
import styles from "./Toast.module.css";
import type { ToastVariant } from "./toastStore";

export { toast };
export type { ToastOptions, ToastVariant } from "./toastStore";

/** Same glyph choice as `Callout`, so the two read as one status-communication
 * language (per Toast.module.css's own variant-colour comment) — `default`
 * gets none, same as Sonner's plain `toast()` having no icon unless a
 * status is actually being reported. */
const icons: Partial<Record<ToastVariant, string>> = {
  success: "✓",
  warning: "!",
  danger: "✕",
};

/** Built-in strings, overridable for translation via `labels`. */
export interface ToastLabels {
  /** Accessible name of each toast's dismiss button. Default `"Dismiss"`. */
  dismiss: string;
}

const defaultToastLabels: ToastLabels = { dismiss: "Dismiss" };

export interface ToastViewportProps {
  className?: ClassNameValue<Record<string, never>>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<ToastLabels>;
}

/** Matches --kernel-space-2, the gap real flex layout used to provide.
 * Kept as a plain number since it feeds a JS sum (the expanded `--offset`),
 * not a CSS declaration. The collapsed per-depth peek step, by contrast,
 * lives entirely in CSS (a fixed 10px) — it needs no real heights. */
const STACK_GAP = 8;
const MAX_COLLAPSED_DEPTH = 3;

/**
 * Mount once, anywhere (the end of your root layout is typical). Every
 * toast renders as its own live region: `danger`/`warning` use
 * `role="alert"` (assertive), `default`/`success` use `role="status"`
 * (polite), the same reasoning as `Callout`.
 *
 * Swipe a toast toward the viewport's edge (inline-end) to dismiss it. The
 * toast follows the pointer one-to-one that way and rubber-bands the other;
 * on release it leaves if it travelled 40% of its width *or* the last 100ms
 * of the gesture were faster than 0.5px/ms (the same windowed flick bar Sheet
 * uses), and otherwise eases back. A pointer pulling back at release keeps the
 * toast even past the distance threshold — intent, not position, decides.
 * The gesture never starts on a button, link or other control inside the
 * toast, claims nothing until 4px of mostly-horizontal travel (so a click is
 * still a click and a vertical pan still scrolls), and only then captures the
 * pointer. Under reduced motion the toast doesn't slide under the pointer; a
 * swipe still dismisses it, by a fade. The close button stays the accessible
 * way to dismiss — the swipe is a shortcut, not the only path.
 */
export function ToastViewport({ className, labels }: ToastViewportProps) {
  const l = { ...defaultToastLabels, ...labels };
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Map<string, number>>(() => new Map());
  const collapseTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(collapseTimer.current), []);

  const reportHeight = useCallback((id: string, height: number) => {
    setHeights((previous) => {
      if (previous.get(id) === height) return previous;
      const next = new Map(previous);
      next.set(id, height);
      return next;
    });
  }, []);

  if (toasts.length === 0) return null;

  // Depth 0 is the newest (last in `toasts`, closest to the anchor corner).
  // A toast mid-exit no longer counts toward anyone else's offset — the
  // gap it leaves should close immediately behind it while it fades
  // independently in place, not hold its spot until it's actually gone.
  //
  // This computes each toast's *expanded* offset (px from the anchor) and
  // hands it to CSS as the `--offset` custom property. It is NOT turned into
  // a JS `translate` — the actual transform lives in the stylesheet, keyed
  // off the viewport's single `data-expanded` attribute (see Toast.module.css).
  // That's the whole fix: hovering flips one attribute and CSS recomputes
  // positions; React never writes a per-render transform that a mid-flight
  // transition could get retargeted to. (The previous model recomputed
  // `translateY` here every render and wrote it inline, so any height/state
  // churn during the expand animation restarted the transition — the flicker.)
  let cumulative = 0;
  const expandedOffsetByDepth: number[] = [];
  for (let depth = 0; depth < toasts.length; depth++) {
    expandedOffsetByDepth[depth] = cumulative;
    const item = toasts[toasts.length - 1 - depth];
    if (item && !item.closing) {
      cumulative += (heights.get(item.id) ?? 60) + STACK_GAP;
    }
  }

  // Expanding the stack and pausing every toast's auto-dismiss are the same
  // gesture, not two separately-wired ones: reading one toast in an expanded
  // stack shouldn't risk another expiring behind it while you're looking,
  // so the single `expanded` boolean below drives both at once.
  function expand() {
    // Cancels any pending collapse — this is the other half of the
    // hysteresis below. A pointer that momentarily crosses a seam and
    // comes right back never actually collapses, because the re-entry
    // lands here before the deferred collapse fires.
    clearTimeout(collapseTimer.current);
    setExpanded(true);
    pauseAllToasts();
  }

  function collapse() {
    // Deferred, not immediate. Even with the gap-fillers keeping the
    // expanded stack contiguous, a real pointer can still register a
    // single-frame `mouseleave` at a card seam or the stack's outer edge
    // mid-animation; collapsing instantly on that would snap a toast back
    // under the cursor and re-expand — the flicker loop. A short delay that
    // any re-entry cancels means only a genuine, sustained departure
    // collapses the stack. Same proven pattern as HoverCard's close delay.
    clearTimeout(collapseTimer.current);
    collapseTimer.current = setTimeout(() => {
      setExpanded(false);
      resumeAllToasts();
    }, 120);
  }

  return (
    <div
      className={[styles.viewport, resolveClassName(className, {})].filter(Boolean).join(" ")}
      data-expanded={dataAttr(expanded)}
      onMouseEnter={expand}
      onMouseLeave={collapse}
      onFocus={expand}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) collapse();
      }}
    >
      {toasts.map((item, index) => {
        const depth = toasts.length - 1 - index;
        return (
          <ToastItem
            key={item.id}
            item={item}
            depth={Math.min(depth, MAX_COLLAPSED_DEPTH)}
            offset={expandedOffsetByDepth[depth] ?? 0}
            zIndex={toasts.length - depth}
            onHeight={(height) => reportHeight(item.id, height)}
            labels={l}
          />
        );
      })}
    </div>
  );
}

function ToastItem({
  item,
  depth,
  offset,
  zIndex,
  onHeight,
  labels,
}: {
  item: ToastRecord;
  depth: number;
  offset: number;
  zIndex: number;
  onHeight: (height: number) => void;
  labels: ToastLabels;
}) {
  const isUrgent = item.variant === "danger" || item.variant === "warning";
  const elementRef = useRef<HTMLDivElement>(null);

  // The swipe engine owns `translate` and `data-dragging` directly, outside
  // React's render loop: a pointer pixel costs no render. Attached once per
  // toast; the id is read through a ref so the listeners never re-bind.
  const idRef = useRef(item.id);
  idRef.current = item.id;
  useEffect(() => {
    const node = elementRef.current;
    if (!node) return;
    return attachToastSwipe(node, () => ({ onDismiss: () => dismissToast(idRef.current) }));
  }, []);

  // Measure ONCE per content change, never with a live ResizeObserver. A
  // toast with a two-line description is taller than a bare title, and the
  // expanded spacing needs each real height — but re-measuring continuously
  // is exactly what caused the flicker: an observer attached for the toast's
  // whole life fires during the expand animation, each callback churns the
  // viewport's `heights` state, re-renders, and (in the old model) retargeted
  // the in-flight transition. This runs in `useLayoutEffect` (pre-paint, so
  // the real height lands on frame 1) and re-runs only when the title or
  // description actually changes. `offsetHeight` is the layout height,
  // independent of the depth `scale()` — never `getBoundingClientRect`, which
  // would fold the transform back in.
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (element) onHeight(element.offsetHeight);
  }, [onHeight, item.title, item.description]);

  return (
    <div
      ref={elementRef}
      role={isUrgent ? "alert" : "status"}
      data-variant={item.variant}
      data-closing={dataAttr(item.closing)}
      data-depth={depth}
      className={styles.toast}
      // Stable stack properties only. Pointer tracking writes the element's
      // non-inheriting `translate` property directly, outside React's render
      // loop; `--offset` remains the expanded distance from the anchor.
      style={
        {
          "--offset": `${offset}px`,
          "--z-index": zIndex,
        } as CSSProperties
      }
    >
      {icons[item.variant] ? (
        <span className={styles.icon} aria-hidden="true">
          {icons[item.variant]}
        </span>
      ) : null}
      <div className={styles.content}>
        <p className={styles.title}>{item.title}</p>
        {item.description ? <p className={styles.description}>{item.description}</p> : null}
      </div>
      <button
        type="button"
        aria-label={labels.dismiss}
        className={styles.close}
        onClick={() => dismissToast(item.id)}
      >
        <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" width="16" height="16">
          <path d="M4 4L12 12M12 4L4 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}
