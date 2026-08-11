import { forwardRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, mergeRefs, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useStickToBottom } from "../../utils/stickToBottom";
import styles from "./MessageScroller.module.css";

export interface MessageScrollerState {
  /** Following the live edge. False once the reader has scrolled away. */
  pinned: boolean;
}

export interface MessageScrollerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className"> {
  children: ReactNode;
  /** The block-size at which the transcript starts scrolling. Omit it and
   * the caller controls height via `className`/`style` instead. */
  maxBlockSize?: string;
  /** Start at the live edge. Pinning is reader-owned after that — see the
   * component's own note on why there's no controlled `pinned` prop. */
  defaultPinned?: boolean;
  /** Pixels from the bottom that still count as pinned. */
  threshold?: number;
  onPinnedChange?: (pinned: boolean) => void;
  /** Show the "jump to latest" control while unpinned. */
  showJumpToLatest?: boolean;
  jumpLabel?: ReactNode;
  /** Re-arms the viewport when it changes — pass a conversation id when
   * swapping the whole transcript, so the new one starts at its own edge. */
  conversationKey?: unknown;
  className?: ClassNameValue<MessageScrollerState>;
  viewportClassName?: ClassNameValue<MessageScrollerState>;
}

/**
 * A conversation viewport that follows streamed output at the live edge,
 * and releases control the moment the reader scrolls away.
 *
 * `role="log"` with `aria-live="polite"` is the standard chat-transcript
 * pattern: appended messages get announced without interrupting, and the
 * container is announced as a log rather than as unlabelled scrolled
 * content. It's deliberately verbose for very long transcripts, so both
 * attributes are overridable through `...rest` — pass `aria-live="off"`
 * when the consumer announces messages itself.
 *
 * `tabIndex={0}` is not decoration: an overflow container that isn't
 * focusable can't be scrolled by keyboard at all in Firefox or Safari,
 * which strands keyboard-only readers in a transcript they can see and
 * can't move.
 *
 * There's no controlled `pinned` prop on purpose. Pinning isn't
 * application state — it's an answer to "is the reader currently at the
 * bottom?", which only the DOM knows. A controlled prop would let a
 * parent assert "pinned" while the reader is 400px up the transcript, and
 * the only way to honour it would be to yank them back down mid-read.
 * `onPinnedChange` reports it; `defaultPinned` seeds it.
 */
export const MessageScroller = forwardRef<HTMLDivElement, MessageScrollerProps>(
  function MessageScroller(
    {
      children,
      maxBlockSize,
      defaultPinned = true,
      threshold,
      onPinnedChange,
      showJumpToLatest = true,
      jumpLabel = "Jump to latest",
      conversationKey,
      className,
      viewportClassName,
      style,
      ...rest
    },
    forwardedRef,
  ) {
    const { viewportRef, contentRef, pinned, scrollToBottom } = useStickToBottom<HTMLDivElement>({
      pinned: defaultPinned,
      threshold,
      onPinnedChange,
      key: conversationKey,
    });
    const state: MessageScrollerState = { pinned };
    const showJump = showJumpToLatest && !pinned;

    return (
      <div
        data-pinned={dataAttr(pinned)}
        style={{ ...style, maxBlockSize }}
        className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
      >
        <div
          {...rest}
          ref={mergeRefs(forwardedRef, viewportRef)}
          role="log"
          aria-live="polite"
          tabIndex={0}
          className={[styles.viewport, resolveClassName(viewportClassName, state)]
            .filter(Boolean)
            .join(" ")}
        >
          <div ref={contentRef} className={styles.content}>
            {children}
          </div>
        </div>
        {/* Always rendered, toggled by attribute: mounting it on unpin
            would mean no exit transition, and `hidden` can't transition
            either. `visibility` handles both — it's discretely animatable
            and takes the control out of the tab order while hidden. */}
        {showJumpToLatest ? (
          <button
            type="button"
            className={styles.jump}
            data-visible={dataAttr(showJump)}
            aria-hidden={showJump ? undefined : true}
            onClick={() => scrollToBottom("smooth")}
          >
            <svg className={styles.jumpIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M8 3.25v9.5M4.25 9L8 12.75L11.75 9"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {jumpLabel}
          </button>
        ) : null}
      </div>
    );
  },
);
