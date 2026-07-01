import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Pagination.module.css";

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/** A real `<nav aria-label="Pagination">` wrapping a real `<ol>` of page
 * links, an ordered trail of pages is exactly what an ordered list is
 * for. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { children, className, ...rest },
  ref,
) {
  return (
    <nav
      {...rest}
      ref={ref}
      aria-label="Pagination"
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      <ol className={styles.list}>{children}</ol>
    </nav>
  );
});

export interface PaginationItemProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  current?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

export function PaginationItem({ current = false, className, ...rest }: PaginationItemProps) {
  return (
    <li>
      <a
        {...rest}
        aria-current={current ? "page" : undefined}
        className={[styles.item, resolveClassName(className, {})].filter(Boolean).join(" ")}
      />
    </li>
  );
}

export interface PaginationControlProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className"> {
  className?: ClassNameValue<Record<string, never>>;
}

export function PaginationPrevious({ className, children, ...rest }: PaginationControlProps) {
  return (
    <li>
      <button
        {...rest}
        type="button"
        aria-label="Go to previous page"
        className={[styles.control, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        ‹ {children ?? "Previous"}
      </button>
    </li>
  );
}

export function PaginationNext({ className, children, ...rest }: PaginationControlProps) {
  return (
    <li>
      <button
        {...rest}
        type="button"
        aria-label="Go to next page"
        className={[styles.control, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        {children ?? "Next"} ›
      </button>
    </li>
  );
}

export function PaginationEllipsis() {
  return (
    <li className={styles.ellipsis} aria-hidden="true">
      …
    </li>
  );
}
