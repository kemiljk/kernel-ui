import { useEffect, useId, useMemo, useRef } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useDetailsTransition } from "../../utils/detailsTransition";
import type { CodeToken } from "../../utils/codeTokens";
import styles from "./FileDiff.module.css";

export type DiffRowKind = "add" | "remove" | "context" | "hunk";

export interface DiffRow {
  kind: DiffRowKind;
  /** Line number in the old file. Absent on added lines. */
  oldLine?: number;
  /** Line number in the new file. Absent on removed lines. */
  newLine?: number;
  /** Un-highlighted content. Ignored when `tokens` is present. */
  content?: string;
  /** Pre-tokenised content, from the same highlighter `CodeBlock` uses. */
  tokens?: CodeToken[];
}

export interface FileDiffState {
  open: boolean;
  streaming: boolean;
  additions: number;
  deletions: number;
}

/** Built-in strings (all screen-reader only), overridable for translation via `labels`. */
export interface FileDiffLabels {
  /** Column header. Default `"Old line"`. */
  oldLine: string;
  /** Column header. Default `"New line"`. */
  newLine: string;
  /** Column header. Default `"Change"`. */
  change: string;
  /** Column header. Default `"Content"`. */
  content: string;
  /** Stands in for `path` in the caption when it isn't plain text. Default `"the file"`. */
  unnamedFile: string;
  /** Table caption. Default ``(path, additions, deletions) => `Changes to ${path}: ${additions} added, ${deletions} removed` ``. */
  caption: (path: string, additions: number, deletions: number) => string;
}

const defaultFileDiffLabels: FileDiffLabels = {
  oldLine: "Old line",
  newLine: "New line",
  change: "Change",
  content: "Content",
  unnamedFile: "the file",
  caption: (path, additions, deletions) => `Changes to ${path}: ${additions} added, ${deletions} removed`,
};

export interface FileDiffProps
  extends Omit<HTMLAttributes<HTMLDetailsElement>, "className" | "children"> {
  /** The changed file's path, shown on the summary. */
  path: ReactNode;
  rows: DiffRow[];
  /** Rows are still arriving. Keeps the diff open, then collapses it a beat
   * after the change lands. */
  streaming?: boolean;
  showLineNumbers?: boolean;
  /** Collapse once the diff is complete. */
  collapseOnComplete?: boolean;
  /** Defaults to `true`. */
  defaultOpen?: boolean;
  /** Explicit counts, when `rows` is a window onto a larger diff. Derived from `rows` when omitted. */
  additions?: number;
  /** Same as `additions`: derived from `rows` when omitted. */
  deletions?: number;
  className?: ClassNameValue<FileDiffState>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<FileDiffLabels>;
}

const MARKERS: Record<DiffRowKind, string> = {
  add: "+",
  remove: "−",
  context: " ",
  hunk: "@",
};

/**
 * A file's changes as a real `<table>` inside a `<details>`.
 *
 * A diff *is* tabular data — old line number, new line number, change marker,
 * content — so it's a table, which is also what gives each row a readable
 * structure instead of a wall of pre-formatted text. Line numbers live in
 * their own cells rather than in the content, so copying a diff copies the
 * code.
 *
 * The change marker (`+`/`−`) stays in the DOM as text. Colour alone doesn't
 * tell you whether a line was added or removed, and a diff where that's
 * ambiguous is a diff you can't read.
 *
 * Like `Reasoning`, the streaming edge is what drives the disclosure: it holds
 * open while rows arrive, then settles closed a beat after they stop, so the
 * completed change registers before it folds away. Manual toggling after that
 * is left alone.
 */
export function FileDiff({
  path,
  rows,
  streaming = false,
  showLineNumbers = true,
  collapseOnComplete = false,
  defaultOpen,
  additions,
  deletions,
  className,
  labels,
  ...rest
}: FileDiffProps) {
  const l = { ...defaultFileDiffLabels, ...labels };
  const counts = useMemo(() => {
    let added = 0;
    let removed = 0;
    for (const row of rows) {
      if (row.kind === "add") added += 1;
      else if (row.kind === "remove") removed += 1;
    }
    return { added, removed };
  }, [rows]);
  const resolvedAdditions = additions ?? counts.added;
  const resolvedDeletions = deletions ?? counts.removed;

  const pathId = useId();
  const { detailsRef, contentRef, open, setOpen } = useDetailsTransition({
    defaultOpen: defaultOpen ?? true,
  });
  const wasStreaming = useRef(streaming);

  // Only acts on the streaming edge, never on every render — otherwise a
  // reader who reopened a collapsed diff would have it slammed shut again by
  // the next re-render. Same rule, and the same reasoning, as `Reasoning`.
  useEffect(() => {
    if (wasStreaming.current === streaming) return;
    wasStreaming.current = streaming;
    if (streaming) {
      setOpen(true);
      return;
    }
    if (!collapseOnComplete) return;
    const timer = window.setTimeout(() => setOpen(false), 600);
    return () => window.clearTimeout(timer);
  }, [streaming, collapseOnComplete, setOpen]);

  const state: FileDiffState = {
    open,
    streaming,
    additions: resolvedAdditions,
    deletions: resolvedDeletions,
  };

  return (
    <details
      {...rest}
      ref={detailsRef}
      data-streaming={dataAttr(streaming)}
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
    >
      <summary className={styles.trigger}>
        <span id={pathId} className={styles.path}>{path}</span>
        <span className={styles.counts}>
          <span className={styles.additions}>+{resolvedAdditions}</span>
          <span className={styles.deletions}>−{resolvedDeletions}</span>
        </span>
        <svg className={styles.chevron} viewBox="0 0 16 16" width="14" height="14" fill="none" aria-hidden="true">
          <path
            d="M4 6L8 10L12 6"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </summary>

      <div
        ref={contentRef}
        className={styles.content}
        // Wide diffs scroll sideways: reachable by keyboard, named by the path.
        tabIndex={0}
        role="region"
        aria-labelledby={pathId}
      >
        <table className={styles.table}>
          <caption className="kernel-sr-only">
            {l.caption(typeof path === "string" ? path : l.unnamedFile, resolvedAdditions, resolvedDeletions)}
          </caption>
          {showLineNumbers ? (
            <thead className="kernel-sr-only">
              <tr>
                <th scope="col">{l.oldLine}</th>
                <th scope="col">{l.newLine}</th>
                <th scope="col">{l.change}</th>
                <th scope="col">{l.content}</th>
              </tr>
            </thead>
          ) : null}
          <tbody>
            {rows.map((row, index) => (
              // Index keys: a diff grows at the end while streaming, so this
              // is what keeps earlier rows mounted rather than re-created.
              // eslint-disable-next-line react/no-array-index-key
              <tr key={index} className={styles.row} data-kind={row.kind}>
                {showLineNumbers ? (
                  <>
                    <td className={styles.number}>{row.oldLine ?? ""}</td>
                    <td className={styles.number}>{row.newLine ?? ""}</td>
                  </>
                ) : null}
                <td className={styles.marker}>{MARKERS[row.kind]}</td>
                <td className={styles.code}>
                  {row.tokens
                    ? row.tokens.map((token, tokenIndex) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <span
                          key={tokenIndex}
                          className={token.className}
                          style={{ color: token.color }}
                        >
                          {token.text}
                        </span>
                      ))
                    : row.content}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}
