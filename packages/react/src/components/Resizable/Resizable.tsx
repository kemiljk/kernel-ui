import { useCallback, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Resizable.module.css";

export interface ResizableState {
  orientation: "horizontal" | "vertical";
  dragging: boolean;
}

export interface ResizableProps {
  /** Exactly two panes; this is a two-pane splitter, not an N-pane layout. */
  children: [ReactNode, ReactNode];
  defaultSplit?: number;
  min?: number;
  max?: number;
  /** `"horizontal"` panes sit side by side with a vertical divider between
   * them; `"vertical"` panes stack with a horizontal divider. */
  orientation?: ResizableState["orientation"];
  className?: ClassNameValue<ResizableState>;
}

const SMALL_STEP = 2;
const LARGE_STEP = 10;

/**
 * A `role="separator"` divider between two panes, conceptually a slider
 * that resizes panes instead of picking a number: same `aria-valuenow`/
 * `-min`/`-max` shape, same arrow-key stepping, but the value it reports
 * is the split percentage and dragging it resizes the grid tracks instead
 * of moving a thumb. The percentage is computed in JS from pointer
 * position and fed back in as a single CSS custom property, the grid
 * template itself lives in the stylesheet.
 */
export function Resizable({
  children,
  defaultSplit = 50,
  min = 20,
  max = 80,
  orientation = "horizontal",
  className,
}: ResizableProps) {
  const [split, setSplit] = useState(() => clamp(defaultSplit, min, max));
  const [dragging, setDragging] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const state: ResizableState = { orientation, dragging };

  const updateFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const percent =
        orientation === "horizontal"
          ? ((clientX - rect.left) / rect.width) * 100
          : ((clientY - rect.top) / rect.height) * 100;
      setSplit(clamp(percent, min, max));
    },
    [orientation, min, max],
  );

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    // The OS cursor icon is computed from whatever's physically under the
    // pointer, not the element that captured it, so a fast drag over pane
    // content would otherwise flicker the resize cursor away even though
    // pointer capture keeps tracking correct. Locking it on `body` for the
    // drag's duration, rather than just this element, is what actually
    // keeps the cursor consistent everywhere the pointer travels.
    document.body.style.cursor = orientation === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    updateFromPointer(event.clientX, event.clientY);
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.releasePointerCapture(event.pointerId);
    setDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const step = event.shiftKey ? LARGE_STEP : SMALL_STEP;
    const decreaseKey = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
    const increaseKey = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";

    if (event.key === decreaseKey) {
      event.preventDefault();
      setSplit((current) => clamp(current - step, min, max));
    } else if (event.key === increaseKey) {
      event.preventDefault();
      setSplit((current) => clamp(current + step, min, max));
    } else if (event.key === "Home") {
      event.preventDefault();
      setSplit(min);
    } else if (event.key === "End") {
      event.preventDefault();
      setSplit(max);
    }
  }

  return (
    <div
      ref={rootRef}
      data-orientation={orientation}
      data-dragging={dragging ? "" : undefined}
      style={{ "--kernel-resizable-split": `${split}%` } as CSSProperties}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <div className={styles.pane}>{children[0]}</div>
      <div
        role="separator"
        aria-orientation={orientation === "horizontal" ? "vertical" : "horizontal"}
        aria-valuenow={Math.round(split)}
        aria-valuemin={min}
        aria-valuemax={max}
        tabIndex={0}
        data-dragging={dragging ? "" : undefined}
        className={styles.divider}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onKeyDown={handleKeyDown}
      />
      <div className={styles.pane}>{children[1]}</div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
