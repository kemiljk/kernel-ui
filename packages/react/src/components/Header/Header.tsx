import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Header.module.css";

export interface HeaderState {
  sticky: boolean;
}

export interface HeaderProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** Pins the header to the top of its scroll container with a blurred
   * backdrop. Off by default; a page can have more than one `<header>`,
   * only the top-level site one is usually sticky. */
  sticky?: boolean;
  className?: ClassNameValue<HeaderState>;
}

/** A real `<header>` landmark, not a `<div>` pretending to be one. */
export const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { sticky = false, className, ...rest },
  ref,
) {
  const state: HeaderState = { sticky };
  return (
    <header
      {...rest}
      ref={ref}
      data-sticky={dataAttr(sticky)}
      className={[styles.root, resolveClassName(className, state)]
        .filter(Boolean)
        .join(" ")}
    />
  );
});
