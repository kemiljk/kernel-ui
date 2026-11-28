import { forwardRef, memo, useMemo } from "react";
import type {
  ComponentPropsWithoutRef,
  ComponentType,
  ElementType,
  HTMLAttributes,
  ReactNode,
} from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import {
  isExternalHref,
  parseMarkdown,
  type MarkdownAlign,
  type MarkdownBlock,
  type MarkdownInline,
} from "../../utils/markdown";
import { CodeBlock } from "../CodeBlock/CodeBlock";
import styles from "./StreamingMarkdown.module.css";

export interface StreamingMarkdownState {
  streaming: boolean;
}

/** Built-in strings, overridable for translation via `labels`. */
export interface StreamingMarkdownLabels {
  /** Visually hidden suffix on links that open in a new tab. Default
   * `"(opens in new tab)"`. */
  opensInNewTab: string;
}

const defaultStreamingMarkdownLabels: StreamingMarkdownLabels = {
  opensInNewTab: "(opens in new tab)",
};

/** Every element `StreamingMarkdown` renders that `components` can replace. */
export type StreamingMarkdownTag =
  | "p"
  | "h1"
  | "h2"
  | "h3"
  | "h4"
  | "h5"
  | "h6"
  | "strong"
  | "em"
  | "del"
  | "code"
  | "a"
  | "ul"
  | "ol"
  | "li"
  | "blockquote"
  | "table"
  | "thead"
  | "tbody"
  | "tr"
  | "th"
  | "td"
  | "hr"
  | "br";

/** What a `components.codeBlock` override receives for a fenced block. */
export interface StreamingMarkdownCodeBlockProps {
  code: string;
  language?: string;
  /** True while this fence is still open and text is still arriving. */
  streaming: boolean;
}

/** Element overrides, keyed by tag. Each receives the props the default
 * element would have had (`className`, `children`, `href`…), so spread them
 * to keep Kernel's styling. `codeBlock` replaces the fenced-code renderer
 * (Kernel's `CodeBlock` by default) — the place to plug in a highlighter.
 * Pass a stable object (module scope or `useMemo`): a new object every
 * render re-renders every block, not just the last. */
export type StreamingMarkdownComponents = {
  [K in StreamingMarkdownTag]?: ElementType<ComponentPropsWithoutRef<K>>;
} & {
  codeBlock?: ComponentType<StreamingMarkdownCodeBlockProps>;
};

export interface StreamingMarkdownProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "className" | "children" | "content"> {
  /** The Markdown so far. Append to it as chunks arrive. */
  content: string;
  /** Text is still arriving: unfinished constructs (an open fence, an
   * unclosed `**`, half a link or table row) render as their finished form
   * would, instead of as raw syntax. */
  streaming?: boolean;
  /** Fade newly arrived words in while streaming. Off under reduced motion
   * whatever this says. Default `true`. */
  animate?: boolean;
  components?: StreamingMarkdownComponents;
  className?: ClassNameValue<StreamingMarkdownState>;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<StreamingMarkdownLabels>;
}

interface RenderContext {
  components: StreamingMarkdownComponents;
  labels: StreamingMarkdownLabels;
  /** This block is the one text is arriving into. */
  live: boolean;
  /** Wrap words in fade-in spans (live + animate). */
  fresh: boolean;
}

/**
 * Renders Markdown as it streams in from a model: real elements (`<p>`,
 * `<ol>`, `<table>`, `<blockquote>`, Kernel's `CodeBlock` for fences), built
 * from a parsed tree rather than an HTML string.
 *
 * Never HTML. The parser (`utils/markdown.ts`) produces data and this turns
 * it into React elements, so model text can only ever become text: raw
 * `<script>` or `<img onerror>` in the content renders as those characters.
 * Links keep only `http:`, `https:`, `mailto:` and relative destinations; an
 * unsafe one renders as its text with no `href`. Images render as a link to
 * the image and are never loaded, because an image URL a model wrote is a
 * known way to leak conversation data to a third-party server.
 *
 * Streaming stability is the reason for the component. The top level is
 * split into blocks, each keyed by index and memoised on its own source
 * slice, so a new chunk re-renders only the last block — earlier paragraphs,
 * tables and code blocks keep their DOM nodes, their layout and the reader's
 * text selection. Unfinished syntax renders as its finished form would (see
 * the parser's comment), so nothing flips from raw asterisks to bold, or
 * from a paragraph of pipes to a table, mid-stream.
 *
 * It is deliberately not a live region. A container that announces every
 * appended token reads a stream back word by word, or re-reads the whole
 * answer. Announcing belongs to the transcript: inside `MessageScroller`
 * (`role="log"`, polite), the message is announced as it's added, and
 * `aria-busy` here while `streaming` asks assistive tech to hold this
 * content's updates until it settles, then read the finished text once.
 */
export const StreamingMarkdown = forwardRef<HTMLDivElement, StreamingMarkdownProps>(
  function StreamingMarkdown(
    {
      content,
      streaming = false,
      animate = true,
      components,
      className,
      labels,
      ...rest
    },
    ref,
  ) {
    const blocks = useMemo(() => parseMarkdown(content, { streaming }), [content, streaming]);
    const resolvedComponents = components ?? EMPTY_COMPONENTS;
    const l = useMemo(
      () => ({ ...defaultStreamingMarkdownLabels, ...labels }),
      // Labels are small flat objects; compare by value so an inline
      // `labels={{…}}` doesn't defeat the per-block memo.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [labels?.opensInNewTab],
    );
    const state: StreamingMarkdownState = { streaming };

    return (
      <div
        {...rest}
        ref={ref}
        data-streaming={dataAttr(streaming)}
        aria-busy={streaming || undefined}
        className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
      >
        {blocks.map((entry, index) => {
          const live = streaming && index === blocks.length - 1;
          return (
            // Keyed by index on purpose: a stream only ever grows at the end,
            // so index keys are what let React keep every finished block.
            // eslint-disable-next-line react/no-array-index-key
            <TopBlock
              key={index}
              raw={entry.raw}
              block={entry.block}
              live={live}
              fresh={live && animate}
              components={resolvedComponents}
              labels={l}
            />
          );
        })}
      </div>
    );
  },
);

const EMPTY_COMPONENTS: StreamingMarkdownComponents = {};

interface TopBlockProps {
  raw: string;
  block: MarkdownBlock;
  live: boolean;
  fresh: boolean;
  components: StreamingMarkdownComponents;
  labels: StreamingMarkdownLabels;
}

/** One top-level block. Re-renders only when its own source slice, or
 * whether it's the live block, changes — `block` is a fresh object on every
 * parse, so it's deliberately left out of the comparison. */
const TopBlock = memo(
  function TopBlock({ block, live, fresh, components, labels }: TopBlockProps) {
    return <>{renderBlock(block, { components, labels, live, fresh })}</>;
  },
  (previous, next) =>
    previous.raw === next.raw &&
    previous.live === next.live &&
    previous.fresh === next.fresh &&
    previous.components === next.components &&
    previous.labels === next.labels,
);

function tag<K extends StreamingMarkdownTag>(context: RenderContext, name: K): ElementType {
  return (context.components[name] as ElementType | undefined) ?? name;
}

function textAlign(align: MarkdownAlign): string | undefined {
  // GFM's "left"/"right" are reading-direction edges in practice; map them
  // to logical start/end so a right-to-left page mirrors correctly.
  return align === "left" ? "start" : align === "right" ? "end" : align ?? undefined;
}

function renderBlock(block: MarkdownBlock, context: RenderContext, key?: number, tight = false): ReactNode {
  switch (block.type) {
    case "paragraph": {
      if (tight) return <span key={key}>{renderInlines(block.children, context)}</span>;
      const P = tag(context, "p");
      return (
        <P key={key} className={styles.paragraph}>
          {renderInlines(block.children, context)}
        </P>
      );
    }
    case "heading": {
      const H = tag(context, `h${block.level}` as StreamingMarkdownTag);
      return (
        <H key={key} className={styles.heading} data-level={block.level}>
          {renderInlines(block.children, context)}
        </H>
      );
    }
    case "code": {
      const streaming = context.live && block.open;
      const Override = context.components.codeBlock;
      return (
        <div key={key} className={styles.codeBlock}>
          {Override ? (
            <Override code={block.code} language={block.language} streaming={streaming} />
          ) : (
            <CodeBlock code={block.code} language={block.language} streaming={streaming} />
          )}
        </div>
      );
    }
    case "list": {
      const List = tag(context, block.ordered ? "ol" : "ul");
      const Item = tag(context, "li");
      return (
        <List
          key={key}
          className={styles.list}
          data-tight={dataAttr(block.tight)}
          start={block.ordered && block.start !== undefined && block.start !== 1 ? block.start : undefined}
        >
          {block.items.map((item, index) => (
            // eslint-disable-next-line react/no-array-index-key
            <Item key={index} className={styles.item}>
              {item.blocks.map((child, childIndex) => renderBlock(child, context, childIndex, block.tight))}
            </Item>
          ))}
        </List>
      );
    }
    case "blockquote": {
      const Quote = tag(context, "blockquote");
      return (
        <Quote key={key} className={styles.blockquote}>
          {block.blocks.map((child, index) => renderBlock(child, context, index))}
        </Quote>
      );
    }
    case "table": {
      const Table = tag(context, "table");
      const Head = tag(context, "thead");
      const Body = tag(context, "tbody");
      const Row = tag(context, "tr");
      const Th = tag(context, "th");
      const Td = tag(context, "td");
      return (
        // Focusable so a keyboard user can scroll a table wider than the
        // message; no role, because a landmark per table is noise.
        <div key={key} className={styles.tableScroll} tabIndex={0}>
          <Table className={styles.table}>
            <Head>
              <Row>
                {block.head.map((cell, index) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Th key={index} scope="col" style={{ textAlign: textAlign(block.align[index] ?? null) }}>
                    {renderInlines(cell, context)}
                  </Th>
                ))}
              </Row>
            </Head>
            {block.rows.length > 0 ? (
              <Body>
                {block.rows.map((row, rowIndex) => (
                  // eslint-disable-next-line react/no-array-index-key
                  <Row key={rowIndex}>
                    {row.map((cell, index) => (
                      // eslint-disable-next-line react/no-array-index-key
                      <Td key={index} style={{ textAlign: textAlign(block.align[index] ?? null) }}>
                        {renderInlines(cell, context)}
                      </Td>
                    ))}
                  </Row>
                ))}
              </Body>
            ) : null}
          </Table>
        </div>
      );
    }
    case "rule": {
      const Hr = tag(context, "hr");
      return <Hr key={key} className={styles.rule} />;
    }
  }
}

function renderInlines(nodes: MarkdownInline[], context: RenderContext): ReactNode[] {
  return nodes.map((node, index) => renderInline(node, context, index));
}

function renderInline(node: MarkdownInline, context: RenderContext, key: number): ReactNode {
  switch (node.type) {
    case "text":
      return context.fresh ? <FreshText key={key} text={node.text} /> : node.text;
    case "strong": {
      const Strong = tag(context, "strong");
      return (
        <Strong key={key} className={styles.strong}>
          {renderInlines(node.children, context)}
        </Strong>
      );
    }
    case "em": {
      const Em = tag(context, "em");
      return <Em key={key}>{renderInlines(node.children, context)}</Em>;
    }
    case "del": {
      const Del = tag(context, "del");
      return <Del key={key}>{renderInlines(node.children, context)}</Del>;
    }
    case "code": {
      const Code = tag(context, "code");
      return (
        <Code key={key} className={styles.inlineCode}>
          {node.text}
        </Code>
      );
    }
    case "break": {
      const Br = tag(context, "br");
      return <Br key={key} />;
    }
    case "link": {
      const A = tag(context, "a");
      if (node.href === null) {
        // Unsafe, or still being written: an <a> with no href, which is
        // inert (not focusable, no link role) and reads as plain text. It's
        // still an <a> so a link that's arriving keeps its element — and its
        // words' nodes — when the destination lands.
        return (
          <A key={key} className={styles.link}>
            {renderInlines(node.children, context)}
          </A>
        );
      }
      const external = isExternalHref(node.href);
      return (
        <A
          key={key}
          className={styles.link}
          href={node.href}
          title={node.title}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
        >
          {renderInlines(node.children, context)}
          {external ? <span className="kernel-sr-only"> {context.labels.opensInNewTab}</span> : null}
        </A>
      );
    }
  }
}

/**
 * Text in the live block, one span per word. Spans are keyed by index, so a
 * word that's already on screen keeps its node (and never re-animates) while
 * the next chunk's words mount and fade in. A word still being completed
 * grows inside its existing span. Whitespace stays a bare text node so line
 * breaking is untouched.
 */
function FreshText({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <>
      {parts.map((part, index) =>
        part === "" ? null : /^\s+$/.test(part) ? (
          part
        ) : (
          // eslint-disable-next-line react/no-array-index-key
          <span key={index} className={styles.fresh}>
            {part}
          </span>
        ),
      )}
    </>
  );
}
