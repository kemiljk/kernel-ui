import { forwardRef } from "react";
import type { ElementType, HTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Card.module.css";

export interface CardProps extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  /** A card is usually just a visual grouping (`<div>`), but set this to
   * `"article"` when its content is genuinely self-contained and could
   * be syndicated or distributed on its own (a blog post preview, a
   * product card), that's what `<article>` actually means. This is the
   * one component in Kernel without a single obvious native anchor. */
  as?: "div" | "article" | "section";
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A visual grouping of related content. Renders a `<div>` by default —
 * the honest choice for presentational grouping with no stronger native
 * meaning — and is the one Kernel component without a single obvious
 * native anchor. Set `as="article"` when the content is genuinely
 * self-contained and could be syndicated on its own (a post preview, a
 * product card), or `as="section"` for a thematic region with its own
 * heading. Compose with `CardHeader`, `CardContent`, `CardFooter`,
 * `CardTitle`, and `CardDescription`.
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as = "div", className, ...rest },
  ref,
) {
  const Element = as as ElementType;
  return (
    <Element
      {...rest}
      ref={ref}
      className={[styles.root, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});

function section(base: string | undefined) {
  return forwardRef<HTMLDivElement, Omit<HTMLAttributes<HTMLDivElement>, "className"> & { className?: ClassNameValue<Record<string, never>> }>(
    function Section({ className, ...rest }, ref) {
      return (
        <div
          {...rest}
          ref={ref}
          className={[base, resolveClassName(className, {})].filter(Boolean).join(" ")}
        />
      );
    },
  );
}

export const CardHeader = section(styles.header);
export const CardContent = section(styles.content);
export const CardFooter = section(styles.footer);

export interface CardTitleProps
  extends Omit<HTMLAttributes<HTMLHeadingElement>, "className"> {
  /** Defaults to `h3`: a card usually sits below a page or section
   * heading, pick whatever level is correct for your actual heading
   * outline. */
  level?: 2 | 3 | 4 | 5 | 6;
  children?: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle({ level = 3, className, ...rest }, ref) {
    const Heading = `h${level}` as ElementType;
    return (
      <Heading
        {...rest}
        ref={ref}
        className={[styles.title, resolveClassName(className, {})].filter(Boolean).join(" ")}
      />
    );
  },
);

export const CardDescription = forwardRef<
  HTMLParagraphElement,
  Omit<HTMLAttributes<HTMLParagraphElement>, "className"> & { className?: ClassNameValue<Record<string, never>> }
>(function CardDescription({ className, ...rest }, ref) {
  return (
    <p
      {...rest}
      ref={ref}
      className={[styles.description, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});
