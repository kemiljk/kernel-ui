import { forwardRef } from "react";
import type { AnchorHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Sources.module.css";

export interface SourcesProps extends Omit<HTMLAttributes<HTMLElement>, "className" | "title"> {
  /** Visible heading above the list. Pass `null` to omit it when the
   * surrounding chat message already labels the sources. */
  heading?: ReactNode | null;
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A list of cited sources under an AI response — the footer half of the
 * "inline citations + references" pattern. A real `<section>` wrapping a
 * real `<ul>` of links (`Source`), not a card of styled divs: the heading
 * names the group, each entry is a navigable `<a>`, and find-in-page /
 * open-in-new-tab all work without a custom interaction layer.
 */
export function Sources({
  heading = "Sources",
  children,
  className,
  ...rest
}: SourcesProps) {
  return (
    <section
      {...rest}
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      {heading != null ? <h3 className={styles.heading}>{heading}</h3> : null}
      <ul className={styles.list}>{children}</ul>
    </section>
  );
}

export interface SourceProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "title" | "children"> {
  /** Citation number shown as a small chip (e.g. `1` for `[1]` in the prose). */
  index?: number;
  title: ReactNode;
  /** Hostname or short path shown muted after the title. Derived from
   * `href` when omitted. */
  host?: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

function hostFromHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  try {
    return new URL(href).hostname.replace(/^www\./, "");
  } catch {
    return href.replace(/^https?:\/\//, "").split("/")[0] || undefined;
  }
}

export const Source = forwardRef<HTMLAnchorElement, SourceProps>(function Source(
  { index, title, host, href, className, target = "_blank", rel, ...rest },
  ref,
) {
  const resolvedHost = host ?? hostFromHref(href);
  const resolvedRel =
    rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);

  return (
    <li className={styles.item}>
      <a
        {...rest}
        ref={ref}
        href={href}
        target={target}
        rel={resolvedRel}
        className={[styles.link, resolveClassName(className, {})].filter(Boolean).join(" ")}
      >
        {index != null ? <span className={styles.index}>{index}</span> : null}
        <span className={styles.title}>{title}</span>
        {resolvedHost != null && resolvedHost !== "" ? (
          <>
            <span className={styles.sep} aria-hidden="true">
              ·
            </span>
            <span className={styles.host}>{resolvedHost}</span>
          </>
        ) : null}
        <svg
          className={styles.arrow}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </a>
    </li>
  );
});

export interface CitationProps
  extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children"> {
  /** The bracket number shown inline in response prose. */
  index: number;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A compact numbered citation chip for use inside response text. Links
 * to the matching `Source` (or any URL) — the visual counterpart of the
 * `[1]` markers models emit in grounded answers.
 */
export const Citation = forwardRef<HTMLAnchorElement, CitationProps>(function Citation(
  { index, className, target = "_blank", rel, ...rest },
  ref,
) {
  const resolvedRel =
    rel ?? (target === "_blank" ? "noopener noreferrer" : undefined);
  return (
    <a
      {...rest}
      ref={ref}
      target={target}
      rel={resolvedRel}
      className={[styles.citation, resolveClassName(className, {})].filter(Boolean).join(" ")}
    >
      {index}
    </a>
  );
});
