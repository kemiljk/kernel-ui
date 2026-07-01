import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Footer.module.css";

export interface FooterProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  className?: ClassNameValue<Record<string, never>>;
}

/** A real `<footer>` landmark. */
export const Footer = forwardRef<HTMLElement, FooterProps>(function Footer(
  { className, ...rest },
  ref,
) {
  return (
    <footer
      {...rest}
      ref={ref}
      className={[styles.root, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
