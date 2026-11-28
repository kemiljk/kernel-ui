import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Pagination.module.css";

/** Built-in strings, overridable for translation via `labels`. One type
 * for every part: each reads only its own keys. */
export interface PaginationLabels {
  /** `Pagination`'s `<nav>` accessible name. Default `"Pagination"`. */
  navigation: string;
  /** `PaginationPrevious`'s accessible name. Default `"Go to previous page"`. */
  previousPage: string;
  /** `PaginationNext`'s accessible name. Default `"Go to next page"`. */
  nextPage: string;
  /** `PaginationPrevious`'s visible text when it has no children. Default `"Previous"`. */
  previous: string;
  /** `PaginationNext`'s visible text when it has no children. Default `"Next"`. */
  next: string;
}

const defaultPaginationLabels: PaginationLabels = {
  navigation: "Pagination",
  previousPage: "Go to previous page",
  nextPage: "Go to next page",
  previous: "Previous",
  next: "Next",
};

export interface PaginationProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<PaginationLabels>;
}

/** A real `<nav aria-label="Pagination">` wrapping a real `<ol>` of page
 * links, an ordered trail of pages is exactly what an ordered list is
 * for. */
export const Pagination = forwardRef<HTMLElement, PaginationProps>(function Pagination(
  { children, className, labels, ...rest },
  ref,
) {
  return (
    <nav
      {...rest}
      ref={ref}
      aria-label={labels?.navigation ?? defaultPaginationLabels.navigation}
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
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<PaginationLabels>;
}

export function PaginationPrevious({ className, children, labels, ...rest }: PaginationControlProps) {
  const l = { ...defaultPaginationLabels, ...labels };
  return (
    <li>
      <button
        {...rest}
        type="button"
        aria-label={l.previousPage}
        className={[styles.control, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M10 4L6 8L10 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className={styles.label}>{children ?? l.previous}</span>
      </button>
    </li>
  );
}

export function PaginationNext({ className, children, labels, ...rest }: PaginationControlProps) {
  const l = { ...defaultPaginationLabels, ...labels };
  return (
    <li>
      <button
        {...rest}
        type="button"
        aria-label={l.nextPage}
        className={[styles.control, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        <span className={styles.label}>{children ?? l.next}</span>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
          <path d="M6 4L10 8L6 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
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
