import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Sidebar.module.css";

export interface SidebarProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** Required: an `<aside>` is a "complementary" landmark, and a page can
   * have several, so each needs its own accessible name. */
  "aria-label": string;
  className?: ClassNameValue<Record<string, never>>;
}

/** A real `<aside>` landmark for secondary or complementary content, e.g.
 * docs navigation, a table of contents, or filters next to a list. */
export const Sidebar = forwardRef<HTMLElement, SidebarProps>(function Sidebar(
  { className, ...rest },
  ref,
) {
  return (
    <aside
      {...rest}
      ref={ref}
      className={[styles.root, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
