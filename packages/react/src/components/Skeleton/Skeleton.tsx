import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Skeleton.module.css";

export interface SkeletonProps extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A loading placeholder. `aria-hidden` is what makes this correct:
 * there's no content here yet, so assistive tech should skip it
 * entirely rather than announce an empty, decorative box. Size it with
 * `style` or your own class to match the real content it stands in for.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...rest },
  ref,
) {
  return (
    <div
      {...rest}
      ref={ref}
      aria-hidden="true"
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});
