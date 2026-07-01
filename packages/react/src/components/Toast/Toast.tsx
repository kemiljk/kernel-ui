import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type PointerEvent as ReactPointerEvent,
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
import styles from "./Toast.module.css";
import type { ToastVariant } from "./toastStore";

export { toast };
export type { ToastOptions, ToastVariant } from "./toastStore";

/** Same glyph choice as `Alert`, so the two read as one status-communication
 * language (per Toast.module.css's own variant-colour comment) — `default`
 * gets none, same as Sonner's plain `toast()` having no icon unless a
 * status is actually being reported. */
const icons: Partial<Record<ToastVariant, string>> = {
  success: "✓",
  warning: "!",
  danger: "✕",
};

export interface ToastViewportProps {
  className?: ClassNameValue<Record<string, never>>;
}

/** Matches --kernel-space-2, the gap real flex layout used to provide.
 * Kept as a plain number since it feeds a JS sum, not a CSS declaration. */
const STACK_GAP = 8;
/** Fixed per-depth peek offset while collapsed — deliberately not derived
 * from real heights like the expanded offsets below: Sonner's own
 * collapsed stack uses fixed steps too, real height differences between
 * toasts would make the peeking slivers behind the front toast visibly
 * uneven, which reads as messier, not more accurate. */
const COLLAPSED_STEP = 10;
const MAX_COLLAPSED_DEPTH = 3;

/**
 * Mount once, anywhere (the end of your root layout is typical). Every
 * toast renders as its own live region: `danger`/`warning` use
 * `role="alert"` (assertive), `default`/`success` use `role="status"`
 * (polite), the same reasoning as `Alert`.
 */
export function ToastViewport({ className }: ToastViewportProps) {
  const toasts = useSyncExternalStore(subscribeToasts, getToastSnapshot, getToastSnapshot);
  const [expanded, setExpanded] = useState(false);
  const [heights, setHeights] = useState<Map<string, number>>(() => new Map());

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
    setExpanded(true);
    pauseAllToasts();
  }

  function collapse() {
    setExpanded(false);
    resumeAllToasts();
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
        const collapsedY = -Math.min(depth, MAX_COLLAPSED_DEPTH) * COLLAPSED_STEP;
        const translateY = expanded ? -(expandedOffsetByDepth[depth] ?? 0) : collapsedY;
        return (
          <ToastItem
            key={item.id}
            item={item}
            depth={Math.min(depth, MAX_COLLAPSED_DEPTH)}
            translateY={translateY}
            onHeight={(height) => reportHeight(item.id, height)}
          />
        );
      })}
    </div>
  );
}

/** Swipe-to-dismiss threshold: a flick past this speed (px/ms) dismisses
 * regardless of distance travelled, matching how Sonner reads a quick flick
 * as intentional even if the pointer didn't travel far. */
const DISMISS_VELOCITY = 0.5;

function ToastItem({
  item,
  depth,
  translateY,
  onHeight,
}: {
  item: ToastRecord;
  depth: number;
  translateY: number;
  onHeight: (height: number) => void;
}) {
  const isUrgent = item.variant === "danger" || item.variant === "warning";
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef<{ x: number; time: number } | null>(null);

  // Real height, not an assumption: a toast with a two-line description is
  // taller than a bare title, and the stack's expanded spacing has to
  // account for that or later toasts would overlap it. ResizeObserver, not
  // just a mount-time measurement, because content can still reflow (a
  // long description wrapping differently after a font loads, e.g.).
  useLayoutEffect(() => {
    const element = elementRef.current;
    if (!element) return;
    onHeight(element.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) onHeight(entry.target.getBoundingClientRect().height);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [onHeight, item.title, item.description]);

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.button !== 0) return;
    // Same check Sonner's own swipe handler does: a press that starts on
    // the close button (or any other interactive element a consumer adds
    // inside a toast) is a click, not a swipe. Starting the drag/capture
    // dance here anyway is what silently swallowed close-button clicks —
    // pointer capture redirects the matching pointerup away from the
    // button, so the click never gets to synthesize.
    if ((event.target as HTMLElement).closest("button")) return;
    dragStart.current = { x: event.clientX, time: performance.now() };
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!dragStart.current) return;
    setDragX(event.clientX - dragStart.current.x);
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const start = dragStart.current;
    if (!start) return;
    dragStart.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture(event.pointerId);

    const deltaX = event.clientX - start.x;
    const elapsed = Math.max(1, performance.now() - start.time);
    const velocity = Math.abs(deltaX) / elapsed;
    const width = elementRef.current?.offsetWidth ?? 0;

    if (Math.abs(deltaX) > width * 0.4 || velocity > DISMISS_VELOCITY) {
      setDragX(deltaX > 0 ? width * 1.5 : -width * 1.5);
      dismissToast(item.id);
      return;
    }

    // Not resuming the timer here on purpose: the pointer is still over
    // this toast (it just finished a press-release-without-dismiss), which
    // means the viewport's own `onMouseEnter` is still active and has
    // already paused every toast — resuming now would restart the
    // countdown while still hovering it. `collapse()` (the viewport's
    // `onMouseLeave`) is the only thing that should resume anyone.
    setDragX(0);
  }

  return (
    <div
      ref={elementRef}
      role={isUrgent ? "alert" : "status"}
      data-variant={item.variant}
      data-closing={dataAttr(item.closing)}
      data-depth={depth}
      data-dragging={dataAttr(dragging)}
      className={styles.toast}
      style={{
        translate: `${dragX}px ${translateY}px`,
        transition: dragging ? "none" : undefined,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
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
        aria-label="Dismiss"
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
