import { forwardRef } from "react";
import type {
  HTMLAttributes,
  LiHTMLAttributes,
  OlHTMLAttributes,
  ReactNode,
  Ref,
} from "react";
import {
  dataAttr,
  mergeRefs,
  resolveClassName,
  type ClassNameValue,
} from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import { useLineFit } from "../../utils/lineFit";
import styles from "./Message.module.css";

export interface MessageListProps
  extends Omit<OlHTMLAttributes<HTMLOListElement>, "className"> {
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A transcript is a real `<ol>`. Chat messages are ordered — "the third
 * thing said" is meaningful, and reordering them changes the meaning —
 * which is exactly what `<ol>` encodes, and what a stack of `<div>`s
 * throws away. Screen readers get "list, 12 items" and item positions for
 * free; keyboard readers get list navigation.
 */
export const MessageList = forwardRef<HTMLOListElement, MessageListProps>(
  function MessageList({ className, ...rest }, forwardedRef) {
    return (
      <ol
        {...rest}
        ref={forwardedRef}
        className={[styles.list, resolveClassName(className, {})].filter(Boolean).join(" ")}
      />
    );
  },
);

export type MessageAuthor = "user" | "assistant" | "system";

export interface MessageState {
  author: MessageAuthor;
  grouped: boolean;
}

export interface MessageProps extends Omit<LiHTMLAttributes<HTMLLIElement>, "className"> {
  children: ReactNode;
  /** Who is speaking. Drives alignment and tone defaults in CSS via
   * `data-author`, and the message's accessible name. */
  author?: MessageAuthor;
  /** Rendered in the avatar slot — an `<Avatar>`, an initial, an icon.
   * Decorative by default: the author is already announced through the
   * message's own label, so a duplicated avatar reading is noise. */
  avatar?: ReactNode;
  /** Visible author name. */
  name?: ReactNode;
  /** Timestamp, model name, token count — anything trailing the message. */
  metadata?: ReactNode;
  /** Consecutive message from the same author: drops the repeated avatar
   * and header, keeps the row's alignment and tightens its spacing. */
  grouped?: boolean;
  /** Marks this message as the one currently being written. */
  live?: boolean;
  /** One-shot enter animation when the row first mounts. */
  animateOnMount?: boolean;
  className?: ClassNameValue<MessageState>;
  bodyClassName?: ClassNameValue<MessageState>;
}

/**
 * One row of a conversation: an `<li>` in the transcript's `<ol>`, wrapping
 * an `<article>`.
 *
 * `<article>` is the right element for a message — it's self-contained
 * syndicatable content, and it's what puts each message in the screen
 * reader's article rotor so readers can jump message to message instead of
 * arrowing through every line. Its `aria-label` carries the author, which
 * is why `avatar` is `aria-hidden`: the author is already announced.
 *
 * The mount-only enter animation is a plain CSS `animation` rather than a
 * JS-driven transition, because "animate on mount and never again" is what
 * a keyframe animation on a freshly inserted element already means — a
 * re-render doesn't restart it, so re-rendering a long transcript can't
 * re-animate its history.
 */
export const Message = forwardRef<HTMLLIElement, MessageProps>(function Message(
  {
    children,
    author = "assistant",
    avatar,
    name,
    metadata,
    grouped = false,
    live = false,
    animateOnMount = true,
    className,
    bodyClassName,
    ...rest
  },
  forwardedRef,
) {
  const state: MessageState = { author, grouped };
  const header = !grouped && (name || live);

  return (
    <li
      {...rest}
      ref={forwardedRef}
      data-author={author}
      data-grouped={dataAttr(grouped)}
      data-live={dataAttr(live)}
      data-animate={dataAttr(animateOnMount)}
      className={[styles.item, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {/* Always rendered. A grouped row has to reserve the avatar column even
          though it draws nothing in it, or the run steps left off the text
          column it belongs to — and a transcript with no avatars at all
          collapses the box via `:empty` in CSS, so neither case needs the
          consumer to know which sibling came before. */}
      <span className={styles.avatar} aria-hidden="true" data-hidden={dataAttr(grouped)}>
        {grouped ? null : avatar}
      </span>
      <article
        aria-label={typeof name === "string" ? name : author}
        className={[styles.body, resolveClassName(bodyClassName, state)]
          .filter(Boolean)
          .join(" ")}
      >
        {header ? (
          <header className={styles.header}>
            {name ? <span className={styles.name}>{name}</span> : null}
            {live ? <span className={styles.liveMark}>Writing</span> : null}
          </header>
        ) : null}
        {children}
        {metadata ? <footer className={styles.metadata}>{metadata}</footer> : null}
      </article>
    </li>
  );
});

export type MessageTone = "neutral" | "accent" | "muted" | "danger";

export interface MessageBubbleState {
  tone: MessageTone;
  open: boolean;
}

export interface MessageBubbleProps
  extends Omit<HTMLAttributes<HTMLElement>, "className"> {
  children: ReactNode;
  tone?: MessageTone;
  /** Which edge the bubble hugs. Independent of `Message`'s `author` on
   * purpose — a system notice from the "assistant" side can still be
   * centred, and a user quote can be shown inline. */
  align?: "start" | "center" | "end";
  /** Collapse long content behind a disclosure. */
  expandable?: boolean;
  expandLabel?: ReactNode;
  defaultOpen?: boolean;
  className?: ClassNameValue<MessageBubbleState>;
}

/**
 * The conversational surface itself. Tone and alignment are `data-*`
 * attributes on one root, not extra classes — so consumers restyle a tone
 * by selecting `[data-tone="accent"]` and never have to reproduce Kernel's
 * class-composition order.
 *
 * `expandable` renders a real `<details>` (height-animated by
 * `DetailsPanelAnimator`, same as `Reasoning` and `Accordion`), so a
 * collapsed message is still findable by in-page search in browsers that
 * expand `<details>` for find-in-page — which a `max-height` clamp isn't.
 */
export const MessageBubble = forwardRef<HTMLElement, MessageBubbleProps>(
  function MessageBubble(
    {
      children,
      tone = "neutral",
      align = "start",
      expandable = false,
      expandLabel = "Show more",
      defaultOpen = false,
      className,
      ...rest
    },
    forwardedRef,
  ) {
    const { detailsRef, contentRef, open } = useDetailsTransition({ defaultOpen });
    // Only the plain bubble's radius is line-dependent. An expandable one is a
    // <details> whose height is its summary plus whatever is disclosed, which
    // says nothing about how many lines the message runs to.
    const lineFitRef = useLineFit<HTMLDivElement>();
    const state: MessageBubbleState = { tone, open: expandable ? open : true };
    const rootClassName = [styles.bubble, resolveClassName(className, state)]
      .filter(Boolean)
      .join(" ");

    if (!expandable) {
      return (
        <div
          {...rest}
          ref={mergeRefs(forwardedRef as Ref<HTMLDivElement>, lineFitRef)}
          data-tone={tone}
          data-align={align}
          className={rootClassName}
        >
          {children}
        </div>
      );
    }

    return (
      <details
        {...rest}
        ref={(node) => {
          detailsRef.current = node;
          if (typeof forwardedRef === "function") forwardedRef(node);
          else if (forwardedRef) forwardedRef.current = node;
        }}
        data-tone={tone}
        data-align={align}
        data-expandable="true"
        className={rootClassName}
      >
        <summary className={styles.expandTrigger}>
          {expandLabel}
          <svg className={styles.expandIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </summary>
        <div ref={contentRef} className={styles.expandContent}>
          {children}
        </div>
      </details>
    );
  },
);
