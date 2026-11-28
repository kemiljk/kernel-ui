import { forwardRef, useId } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./EmptyState.module.css";

export type EmptyStateHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface EmptyStateState {
  variant: "dashed" | "plain";
}

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "title"> {
  /** The heading. Rendered as a real `<h1>`–`<h6>` (see `headingLevel`)
   * and used as the section's accessible name. */
  title: ReactNode;
  /** Which heading element `title` renders as, so the empty state slots
   * into the page's outline. Defaults to `3`. */
  headingLevel?: EmptyStateHeadingLevel;
  /** One or two sentences under the heading: why it's empty, and what
   * happens next. */
  description?: ReactNode;
  /** A decorative illustration or icon above the heading. It's hidden
   * from assistive tech, because the heading already says what it means. */
  icon?: ReactNode;
  /** Buttons or links for the next step, e.g. "Upload a file". */
  actions?: ReactNode;
  /** `dashed` (default) draws a dashed outline, the convention for "a
   * space waiting for content"; `plain` drops it for use inside a surface
   * that already has its own edge. */
  variant?: EmptyStateState["variant"];
  className?: ClassNameValue<EmptyStateState>;
}

/**
 * A zero-data placeholder: the "nothing here yet" panel for an empty
 * list, inbox, search or project. It's a real `<section>` labelled by its
 * own heading (`aria-labelledby`), and the heading is a real `<h1>`–`<h6>`
 * chosen by `headingLevel`, so a screen-reader user navigating by heading
 * or landmark lands on it and hears what's missing, rather than meeting
 * a block of unlabelled centred text.
 *
 * The icon is decorative (`aria-hidden`): the heading carries the
 * meaning. Extra content passed as `children` sits between the
 * description and the actions.
 *
 * Shaped as a container: `--kernel-radius-container` with
 * `--kernel-padding-container-curve`, plus extra block padding so the
 * content sits calmly in the middle at every rounding.
 */
export const EmptyState = forwardRef<HTMLElement, EmptyStateProps>(function EmptyState(
  {
    title,
    headingLevel = 3,
    description,
    icon,
    actions,
    variant = "dashed",
    className,
    children,
    id,
    ...rest
  },
  ref,
) {
  const generatedId = useId();
  const baseId = id ?? generatedId;
  const titleId = `${baseId}-title`;
  const descriptionId = `${baseId}-description`;
  const Heading = `h${headingLevel}` as "h3";
  const state: EmptyStateState = { variant };

  return (
    <section
      {...rest}
      ref={ref}
      id={id}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-slot="empty-state"
      data-variant={variant}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {icon ? (
        <div className={styles.icon} aria-hidden="true" data-slot="empty-state-icon">
          {icon}
        </div>
      ) : null}
      <Heading id={titleId} className={styles.title} data-slot="empty-state-title">
        {title}
      </Heading>
      {description ? (
        <p id={descriptionId} className={styles.description} data-slot="empty-state-description">
          {description}
        </p>
      ) : null}
      {children}
      {actions ? (
        <div className={styles.actions} data-slot="empty-state-actions">
          {actions}
        </div>
      ) : null}
    </section>
  );
});
