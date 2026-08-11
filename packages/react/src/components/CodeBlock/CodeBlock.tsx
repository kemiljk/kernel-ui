import { useEffect, useMemo, useRef, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { linesFromCode, linesText, type CodeLine } from "../../utils/codeTokens";
import { useStickToBottom } from "../../utils/stickToBottom";
import styles from "./CodeBlock.module.css";

export interface CodeBlockState {
  streaming: boolean;
  copied: boolean;
}

export interface CodeBlockProps
  extends Omit<HTMLAttributes<HTMLElement>, "className" | "children"> {
  /** Pre-tokenised lines from your highlighter of choice. Takes precedence
   * over `code`. */
  lines?: CodeLine[];
  /** Un-highlighted source. Rendered as one plain token per line. */
  code?: string;
  /** Shown in the header, and set as the `<code>`'s `data-language`. */
  language?: string;
  /** Header title — a file path, usually. Falls back to `language`. */
  label?: ReactNode;
  showLineNumbers?: boolean;
  /** 1-based line numbers to emphasise. */
  highlightLines?: number[];
  /** Output is still arriving: the block follows its own last line. */
  streaming?: boolean;
  copyable?: boolean;
  /** Height at which the block starts scrolling. */
  maxBlockSize?: string;
  className?: ClassNameValue<CodeBlockState>;
}

/**
 * A code surface: a real `<pre><code>` inside a `<figure>`, with optional
 * line numbers, emphasised lines, copy, and stable streaming.
 *
 * It highlights nothing itself — it takes pre-tokenised `lines` (see
 * `utils/codeTokens.ts`) — which is what keeps this package dependency-free
 * and lets the same component serve Shiki, Prism, a server-side highlighter,
 * or plain text. `code` is the un-highlighted path.
 *
 * "Stable streaming" is the interesting part. Lines are keyed by index, so
 * appending output re-renders only the last line: earlier lines aren't
 * unmounted and re-created, which is what causes the flicker and lost text
 * selection you get from re-rendering a growing block as one string. Following
 * the last line reuses `StickToBottomController` — the same behaviour
 * `MessageScroller` is built on — rather than a second scroll implementation.
 *
 * Line numbers are rendered as real text but marked `aria-hidden` and made
 * unselectable: a screen reader reading "one const two import three…" is
 * noise, and a copy that interleaves line numbers with code is worse than no
 * copy button at all.
 */
export function CodeBlock({
  lines,
  code = "",
  language,
  label,
  showLineNumbers = false,
  highlightLines,
  streaming = false,
  copyable = true,
  maxBlockSize,
  className,
  style,
  ...rest
}: CodeBlockProps) {
  const resolvedLines = useMemo(
    () => lines ?? linesFromCode(code),
    [lines, code],
  );
  const highlighted = useMemo(() => new Set(highlightLines ?? []), [highlightLines]);
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef<number | undefined>(undefined);
  const { viewportRef, contentRef, pinned, scrollToBottom } = useStickToBottom<HTMLDivElement>({
    pinned: true,
  });

  useEffect(() => () => window.clearTimeout(copyTimer.current), []);

  // Only follow while output is arriving. A finished block that the reader
  // scrolled up in shouldn't be dragged back down by a re-render.
  useEffect(() => {
    if (streaming && pinned) scrollToBottom("instant");
  }, [streaming, pinned, resolvedLines, scrollToBottom]);

  const state: CodeBlockState = { streaming, copied };
  const heading = label ?? language;

  async function copy() {
    try {
      await navigator.clipboard.writeText(linesText(resolvedLines));
      setCopied(true);
      window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be denied outright (permissions, insecure
      // context). Staying silent is right: the code is still on screen and
      // selectable, so there's nothing the reader needs to act on.
    }
  }

  return (
    <figure
      {...rest}
      data-streaming={dataAttr(streaming)}
      style={{ ...style, ["--kernel-code-max-block-size" as string]: maxBlockSize }}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      {heading || copyable ? (
        <figcaption className={styles.header}>
          {heading ? <span className={styles.heading}>{heading}</span> : null}
          {copyable ? (
            <button type="button" className={styles.copy} onClick={copy}>
              <svg className={styles.copyIcon} viewBox="0 0 16 16" fill="none" aria-hidden="true">
                {copied ? (
                  <path
                    d="M3.5 8.5 6.5 11.5 12.5 5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ) : (
                  <>
                    <rect
                      x="5.75"
                      y="5.75"
                      width="7.5"
                      height="7.5"
                      rx="1.75"
                      stroke="currentColor"
                      strokeWidth="1.25"
                    />
                    <path
                      d="M10.25 5.5v-1a1.75 1.75 0 0 0-1.75-1.75h-4A1.75 1.75 0 0 0 2.75 4.5v4c0 .97.78 1.75 1.75 1.75h1"
                      stroke="currentColor"
                      strokeWidth="1.25"
                      strokeLinecap="round"
                    />
                  </>
                )}
              </svg>
              {copied ? "Copied" : "Copy"}
            </button>
          ) : null}
        </figcaption>
      ) : null}

      <div ref={viewportRef} className={styles.viewport}>
        <div ref={contentRef}>
          <pre className={styles.pre}>
            <code className={styles.code} data-language={language}>
              {resolvedLines.map((line, index) => (
                // Keyed by index on purpose: streamed output grows at the end,
                // so index keys are what let React update the last line in
                // place instead of unmounting the ones above it.
                // eslint-disable-next-line react/no-array-index-key
                <span
                  key={index}
                  className={styles.line}
                  data-highlight={dataAttr(highlighted.has(index + 1))}
                >
                  {showLineNumbers ? (
                    <span className={styles.number} aria-hidden="true">
                      {index + 1}
                    </span>
                  ) : null}
                  <span className={styles.lineText}>
                    {line.tokens.map((token, tokenIndex) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <span key={tokenIndex} className={token.className} style={{ color: token.color }}>
                        {token.text}
                      </span>
                    ))}
                    {"\n"}
                  </span>
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>

      {/* Copy feedback as a live region, not just a changed icon: the button's
          own label changing is announced only if focus happens to be on it. */}
      <span role="status" className="kernel-sr-only">
        {copied ? "Copied to clipboard" : ""}
      </span>
    </figure>
  );
}
