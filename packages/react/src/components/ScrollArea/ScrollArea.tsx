import { forwardRef, useEffect, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./ScrollArea.module.css";

export interface ScrollAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children: ReactNode;
  /** The block-size at which this starts scrolling. Omit it and the
   * caller controls height via `className`/`style` instead. */
  maxBlockSize?: string;
  /** Shows an inset shadow at whichever edge still has content to
   * scroll toward — top, bottom, or both — and hides it again once
   * you've actually scrolled that edge into view. A permanent cue tied
   * to scroll position, not a transient one tied to the gesture, so it
   * never cuts off mid-scroll the moment your finger or wheel stops. */
  edgeShadow?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

const EDGE_FADE_DISTANCE = 24;

/**
 * A native overflow container. `scrollbar-gutter: stable` reserves the
 * scrollbar's track so content doesn't shift when one appears, and the
 * custom scrollbar colours are pure CSS, layered on as an enhancement,
 * never a replacement for real scrolling.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea(
    { maxBlockSize, edgeShadow, className, style, ...rest },
    forwardedRef,
  ) {
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const el = rootRef.current;
      if (!edgeShadow || !el) return;

      let frame: number | null = null;

      const measure = () => {
        frame = null;
        const scrollable = el.scrollHeight - el.clientHeight;
        const top = scrollable > 0 ? Math.min(el.scrollTop / EDGE_FADE_DISTANCE, 1) : 0;
        const bottom =
          scrollable > 0
            ? Math.min((scrollable - el.scrollTop) / EDGE_FADE_DISTANCE, 1)
            : 0;
        el.style.setProperty("--kernel-scroll-shadow-top", String(top));
        el.style.setProperty("--kernel-scroll-shadow-bottom", String(bottom));
      };

      const scheduleMeasure = () => {
        if (frame === null) frame = requestAnimationFrame(measure);
      };

      measure();
      el.addEventListener("scroll", scheduleMeasure, { passive: true });
      const resizeObserver = new ResizeObserver(scheduleMeasure);
      resizeObserver.observe(el);

      return () => {
        if (frame !== null) cancelAnimationFrame(frame);
        el.removeEventListener("scroll", scheduleMeasure);
        resizeObserver.disconnect();
      };
    }, [edgeShadow]);

    return (
      <div
        {...rest}
        ref={mergeRefs(forwardedRef, rootRef)}
        data-edge-shadow={dataAttr(edgeShadow)}
        style={{ ...style, maxBlockSize }}
        className={[styles.root, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);
