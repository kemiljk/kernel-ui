import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Separator.module.css";

export interface SeparatorState {
  orientation: "horizontal" | "vertical";
}

export interface SeparatorProps extends Omit<HTMLAttributes<HTMLHRElement>, "className"> {
  orientation?: SeparatorState["orientation"];
  className?: ClassNameValue<SeparatorState>;
}

/**
 * A real `<hr>`. Browsers already expose it to assistive tech as
 * `role="separator"`, a horizontal rule is exactly what a divider is.
 * `orientation="vertical"` repaints it as a vertical rule (for a toolbar,
 * say) without changing what it means.
 */
export const Separator = forwardRef<HTMLHRElement, SeparatorProps>(
  function Separator({ orientation = "horizontal", className, ...rest }, ref) {
    const state: SeparatorState = { orientation };
    return (
      <hr
        {...rest}
        ref={ref}
        aria-orientation={orientation === "vertical" ? "vertical" : undefined}
        data-orientation={orientation}
        className={[styles.root, resolveClassName(className, state)]
          .filter(Boolean)
          .join(" ")}
      />
    );
  },
);
