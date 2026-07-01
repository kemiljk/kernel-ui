import { Fragment, forwardRef } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Breadcrumbs.module.css";

export interface BreadcrumbsProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/** A real `<nav aria-label="Breadcrumb">` wrapping a real `<ol>`, it's an
 * ordered trail, list semantics are correct here. */
export const Breadcrumbs = forwardRef<HTMLElement, BreadcrumbsProps>(function Breadcrumbs(
  { children, className, ...rest },
  ref,
) {
  return (
    <nav
      {...rest}
      ref={ref}
      aria-label="Breadcrumb"
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      <ol className={styles.list}>{children}</ol>
    </nav>
  );
});

export interface BreadcrumbItemProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className"> {
  /** The current page isn't a link, it's marked `aria-current="page"` on
   * plain text instead, that's the correct pattern, you don't link to
   * where you already are. */
  current?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

export function BreadcrumbItem({ current = false, children, className, ...rest }: BreadcrumbItemProps) {
  return (
    <li className={styles.item}>
      {current ? (
        <span aria-current="page" className={styles.current}>
          {children}
        </span>
      ) : (
        <a {...rest} className={[styles.link, resolveClassName(className, {})].filter(Boolean).join(" ")}>
          {children}
        </a>
      )}
      {!current ? (
        <span className={styles.separator} aria-hidden="true">
          /
        </span>
      ) : null}
    </li>
  );
}

/** Convenience: build a full trail from an array in one call. */
export interface BreadcrumbsTrailProps {
  items: Array<{ label: ReactNode; href?: string }>;
}

export function BreadcrumbsTrail({ items }: BreadcrumbsTrailProps) {
  return (
    <Breadcrumbs>
      {items.map((item, index) => (
        <Fragment key={index}>
          <BreadcrumbItem href={item.href} current={index === items.length - 1}>
            {item.label}
          </BreadcrumbItem>
        </Fragment>
      ))}
    </Breadcrumbs>
  );
}
