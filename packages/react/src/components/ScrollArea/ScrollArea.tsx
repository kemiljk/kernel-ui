import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./ScrollArea.module.css";

export interface ScrollAreaProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children: ReactNode;
  /** The block-size at which this starts scrolling. Omit it and the
   * caller controls height via `className`/`style` instead. */
  maxBlockSize?: string;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A native overflow container. `scrollbar-gutter: stable` reserves the
 * scrollbar's track so content doesn't shift when one appears, and the
 * custom scrollbar colours are pure CSS, layered on as an enhancement,
 * never a replacement for real scrolling.
 */
export const ScrollArea = forwardRef<HTMLDivElement, ScrollAreaProps>(
  function ScrollArea({ maxBlockSize, className, style, ...rest }, ref) {
    return (
      <div
        {...rest}
        ref={ref}
        style={{ ...style, maxBlockSize }}
        className={[styles.root, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);
