import { forwardRef, useEffect, useId, useRef } from "react";
import type { CSSProperties, InputHTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./Slider.module.css";

export interface SliderProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "value" | "defaultValue" | "onChange"
  > {
  label: ReactNode;
  /** Visually hides the label without removing it from the accessibility
   * tree — see `TextField`'s `hideLabel` for the full rationale. */
  hideLabel?: boolean;
  value?: number;
  defaultValue?: number;
  onValueChange?: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Shows the current numeric value next to the label. */
  showValue?: boolean;
  /** `"default"` is a thin track with a floating thumb. `"inset"` makes
   * the track itself a full-height control (same height and corner as
   * Button or Tabs) that fills with the accent colour, dragged by a slim
   * bar inside the fill's leading edge. */
  variant?: "default" | "inset";
  /** Inset variant only: a caption pinned inside the track's start. */
  startLabel?: ReactNode;
  /** Inset variant only: a caption pinned inside the track's end. */
  endLabel?: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A real `<input type="range">`. Dragging, arrow-key stepping, Page
 * Up/Down, Home/End, and touch support are all native. The filled
 * portion of the track has no standardised styling API yet, so this
 * computes the fill ratio in JS and hands it to CSS as custom properties
 * (`--ratio`, plus `--percent` for anyone styling against it) on the
 * root's inline style, that hand-off is the only JavaScript involved.
 * Inline style rather than an effect so a server render already shows
 * the right fill instead of an empty track until hydration.
 *
 * The inset variant keeps the same input, stretched over the whole
 * track with its own track painted transparent: the fill underneath is
 * one element clipped to the thumb's trailing edge with a rounded
 * `clip-path`, so the fill and the on-accent copy of the start/end
 * captions are cut by the same edge, and each caption changes colour
 * exactly where the fill crosses it. Those captions are `aria-hidden`
 * decoration; the input's value and its `<label>` stay the accessible
 * name and state.
 *
 * The drag bar is a real element rather than paint on the thumb, so it
 * can be measured: when it would land on a caption, the track gets
 * `data-overlap="start" | "end"`. At rest the bar gives way (the fill's
 * edge still shows the value); while hovered, dragged or keyboard-focused
 * the caption gives way instead, because that's when the handle matters.
 * This is the one piece of measuring JS; it runs on value and size
 * changes, never inside the browser's own drag handling.
 */
export const Slider = forwardRef<HTMLInputElement, SliderProps>(function Slider(
  {
    label,
    hideLabel = false,
    value,
    defaultValue = 0,
    onValueChange,
    min = 0,
    max = 100,
    step = 1,
    showValue = false,
    variant = "default",
    startLabel,
    endLabel,
    id,
    className,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const trackRef = useRef<HTMLDivElement>(null);
  const sliderId = id ?? generatedId;

  const [current, setCurrent] = useControllableState({
    value,
    defaultValue,
    onChange: onValueChange,
  });

  const ratio = max > min ? Math.min(Math.max((current - min) / (max - min), 0), 1) : 0;
  const inset = variant === "inset";
  const hasEnds = inset && (startLabel != null || endLabel != null);

  useEffect(() => {
    const track = trackRef.current;
    if (!track || !hasEnds) return;
    const measure = () => {
      const overlap = barOverlap(track);
      if (overlap) track.dataset.overlap = overlap;
      else delete track.dataset.overlap;
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(track);
    return () => observer.disconnect();
  }, [hasEnds, ratio, startLabel, endLabel]);

  const ends = (className: string | undefined) => (
    <div className={className} aria-hidden="true">
      <span>{startLabel}</span>
      <span>{endLabel}</span>
    </div>
  );

  const input = (
    <input
      {...rest}
      ref={ref}
      id={sliderId}
      type="range"
      min={min}
      max={max}
      step={step}
      value={current}
      onChange={(event) => setCurrent(Number(event.target.value))}
      className={[inset ? styles.insetInput : styles.input, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    />
  );

  return (
    <div
      className={styles.root}
      data-variant={variant}
      style={{ "--ratio": ratio, "--percent": `${ratio * 100}%` } as CSSProperties}
    >
      <div className={styles.labelRow}>
        <label
          className={[styles.label, hideLabel ? "kernel-sr-only" : null]
            .filter(Boolean)
            .join(" ")}
          htmlFor={sliderId}
        >
          {label}
        </label>
        {showValue ? <span className={styles.value}>{current}</span> : null}
      </div>
      {inset ? (
        <div className={styles.track} ref={trackRef}>
          {hasEnds ? ends(styles.ends) : null}
          <div className={styles.fill} aria-hidden="true">
            {hasEnds ? ends(styles.ends) : null}
          </div>
          <span className={styles.bar} aria-hidden="true" />
          {input}
        </div>
      ) : (
        input
      )}
    </div>
  );
});

/** Clearance kept between the bar and a caption's text, in px. */
const BAR_CLEARANCE = 6;

/** Which caption, if any, the drag bar sits on. Reads the base caption
 * layer (the fill holds an identical copy at the same positions). */
function barOverlap(track: HTMLElement): "start" | "end" | undefined {
  const bar = track.querySelector(`.${styles.bar}`);
  const captions = track.querySelectorAll(`:scope > .${styles.ends} > span`);
  if (!bar || captions.length < 2) return undefined;
  const b = bar.getBoundingClientRect();
  const hits = (caption: Element) => {
    const c = caption.getBoundingClientRect();
    return c.width > 0 && b.right + BAR_CLEARANCE > c.left && b.left - BAR_CLEARANCE < c.right;
  };
  if (hits(captions[0]!)) return "start";
  if (hits(captions[1]!)) return "end";
  return undefined;
}
