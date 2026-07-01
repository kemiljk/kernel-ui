import { forwardRef } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Nav.module.css";

export interface NavProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** Required: a page can have more than one `<nav>` (primary nav,
   * breadcrumbs, pagination), so each needs its own accessible name. */
  "aria-label": string;
  className?: ClassNameValue<Record<string, never>>;
}

/** A real `<nav>` landmark wrapping a real `<ul>`. Compose it with
 * `NavLink` for each entry. */
export const Nav = forwardRef<HTMLElement, NavProps>(function Nav(
  { children, className, ...rest },
  ref,
) {
  return (
    <nav
      {...rest}
      ref={ref}
      className={[styles.root, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    >
      <ul className={styles.list}>{children}</ul>
    </nav>
  );
});

export interface NavLinkProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * Set `aria-current="page"` on whichever link matches the current route
 * (Astro can compute that at build time from `Astro.url.pathname`). The
 * active style is a plain `[aria-current="page"]` selector, nothing
 * client-side has to run to know which link is active.
 */
export const NavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  function NavLink({ className, ...rest }, ref) {
    return (
      <li className={styles.item}>
        <a
          {...rest}
          ref={ref}
          className={[styles.link, resolveClassName(className, {})]
            .filter(Boolean)
            .join(" ")}
        />
      </li>
    );
  },
);
