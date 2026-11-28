/**
 * A compact, streaming-tolerant Markdown parser: a safe subset of CommonMark
 * plus GFM tables, strikethrough and bare-URL autolinks. Shared, byte for
 * byte, by `@kernelui-lib/react`'s `StreamingMarkdown` and
 * `@kernelui-lib/elements`' `<kernel-streaming-markdown>`.
 *
 * It produces a plain data tree, never HTML. Both renderers turn that tree
 * into real elements (React elements, or `createElement` + `textContent`),
 * so model text can never become markup: a `<script>` or an
 * `<img onerror>` in the source is just text in a text node.
 *
 * Streaming is the reason this exists rather than a general-purpose parser.
 * While `streaming` is true the input is assumed to stop mid-sentence, so:
 *
 * - an unterminated code fence is an open code block, not a paragraph of
 *   backticks;
 * - `**bold` with no closer yet renders bold so far, and markers with
 *   nothing after them yet are hidden rather than flashed as raw `*`;
 * - `[text](http…` renders `text` and hides the half-written destination;
 * - a table whose header has arrived but whose delimiter row hasn't is
 *   already a table, so it doesn't flip from paragraph to table;
 * - a half-written table row is a row, padded to the header's width.
 *
 * The top level is returned as blocks, each with the exact source slice
 * (`raw`) it came from. Renderers key blocks by index and skip any block
 * whose `raw` is unchanged, which is what keeps already-rendered blocks
 * from re-rendering (and flickering, or losing a text selection) as more
 * text arrives — the same index-keyed idea `CodeBlock` uses for lines.
 *
 * Deliberately unsupported: raw HTML (always text), images (rendered as a
 * link, never loaded — auto-loading an image URL a model wrote is a known
 * data-exfiltration channel), indented code blocks, setext headings,
 * reference-style links, footnotes, and task-list checkboxes.
 */

export type MarkdownInline =
  | { type: "text"; text: string }
  | { type: "strong"; children: MarkdownInline[] }
  | { type: "em"; children: MarkdownInline[] }
  | { type: "del"; children: MarkdownInline[] }
  | { type: "code"; text: string }
  /** `href` is `null` when the destination was unsafe, or not written yet. */
  | { type: "link"; href: string | null; title?: string; children: MarkdownInline[] }
  | { type: "break" };

export type MarkdownAlign = "left" | "center" | "right" | null;

export interface MarkdownListItem {
  blocks: MarkdownBlock[];
}

export type MarkdownBlock =
  | { type: "paragraph"; children: MarkdownInline[] }
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; children: MarkdownInline[] }
  /** `open` while the closing fence hasn't arrived. */
  | { type: "code"; language?: string; code: string; open: boolean }
  /** `tight` lists render their paragraphs without `<p>`, as CommonMark does. */
  | { type: "list"; ordered: boolean; start?: number; tight: boolean; items: MarkdownListItem[] }
  | { type: "blockquote"; blocks: MarkdownBlock[] }
  | {
      type: "table";
      align: MarkdownAlign[];
      head: MarkdownInline[][];
      rows: MarkdownInline[][][];
    }
  | { type: "rule" };

/** One top-level block plus the source it was parsed from. */
export interface MarkdownTopBlock {
  raw: string;
  block: MarkdownBlock;
}

export interface ParseMarkdownOptions {
  /** The input may stop mid-construct; see the module comment. */
  streaming?: boolean;
}

/** Parses Markdown into top-level blocks. Never throws, whatever the input. */
export function parseMarkdown(source: string, options: ParseMarkdownOptions = {}): MarkdownTopBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  // A last line that is only the start of a marker (`-`, `**`, `#`, `>`)
  // could still become a list, a rule, emphasis or a heading. Rendering it
  // now would flash one of those and then switch, so hold it back.
  if (options.streaming && lines.length > 0 && /^\s*(?:[-*_+]{1,2}|#{1,6}|>|\d{1,9}[.)]?)\s*$/.test(lines[lines.length - 1]!)) {
    lines[lines.length - 1] = "";
  }
  return parseBlockLines(lines, Boolean(options.streaming), true) as MarkdownTopBlock[];
}

/* ------------------------------------------------------------------ */
/* Safe links                                                          */
/* ------------------------------------------------------------------ */

const SAFE_SCHEMES = new Set(["http", "https", "mailto"]);

/**
 * The destination if it's safe to put in an `href`, otherwise `null`.
 * Allowed: `http:`, `https:`, `mailto:`, and scheme-less (relative, `#`,
 * `/path`, `//host`). Everything else — `javascript:`, `data:`, `vbscript:`,
 * `file:` — is refused. Control characters and whitespace are stripped
 * before the scheme is read, which is how browsers read it too
 * (`java\tscript:` is still `javascript:` to a browser).
 */
export function safeHref(raw: string): string | null {
  const href = raw.trim();
  if (!href) return null;
  // eslint-disable-next-line no-control-regex
  const probe = href.replace(/[\u0000- \u007f]/g, "").toLowerCase();
  const scheme = /^([a-z][a-z0-9+.-]*):/.exec(probe);
  if (scheme) return SAFE_SCHEMES.has(scheme[1]!) ? href : null;
  // A colon before any `/`, `?` or `#` that didn't parse as a scheme is
  // something a browser may still treat as one. Refuse it.
  const colon = probe.indexOf(":");
  if (colon !== -1 && !/[/?#]/.test(probe.slice(0, colon))) return null;
  return href;
}

/** True for a link that leaves the page's origin (absolute http(s) or `//`). */
export function isExternalHref(href: string): boolean {
  return /^(https?:)?\/\//i.test(href.trim());
}

/* ------------------------------------------------------------------ */
/* Blocks                                                              */
/* ------------------------------------------------------------------ */

const FENCE = /^ {0,3}(`{3,}|~{3,})[ \t]*([^`\s]*)[^`]*$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const LIST_ITEM = /^( {0,3})([-*+]|\d{1,9}[.)])(?=[ \t]|$)([ \t]*)/;
const DELIMITER_ROW = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const PARTIAL_DELIMITER_ROW = /^ {0,3}\|?[ \t:|-]*$/;

function isBlank(line: string): boolean {
  return line.trim() === "";
}

/** Starts a block that can interrupt a paragraph. */
function interruptsParagraph(line: string): boolean {
  if (FENCE.test(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line)) return true;
  const item = LIST_ITEM.exec(line);
  if (!item) return false;
  // An empty item, or an ordered one not starting at 1, can't interrupt.
  if (isBlank(line.slice(item[0].length))) return false;
  return !/^\d/.test(item[2]!) || /^1[.)]$/.test(item[2]!);
}

function hasPipe(line: string): boolean {
  return /\|/.test(line.replace(/\\\|/g, ""));
}

function parseBlockLines(lines: string[], streaming: boolean, top: boolean): (MarkdownTopBlock | MarkdownBlock)[] {
  const out: (MarkdownTopBlock | MarkdownBlock)[] = [];
  const push = (block: MarkdownBlock, from: number, to: number) => {
    out.push(top ? { raw: lines.slice(from, to).join("\n"), block } : block);
  };
  let i = 0;

  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }
    const start = i;

    // Fenced code. Unterminated = open: the rest of the input is code.
    const fence = FENCE.exec(line);
    if (fence) {
      const marker = fence[1]!;
      const indent = line.length - line.trimStart().length;
      const body: string[] = [];
      let closed = false;
      i++;
      while (i < lines.length) {
        const next = lines[i]!;
        const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(next);
        if (close && close[1]![0] === marker[0] && close[1]!.length >= marker.length) {
          closed = true;
          i++;
          break;
        }
        body.push(next.slice(Math.min(indent, next.length - next.trimStart().length)));
        i++;
      }
      // A half-typed closing fence at the very end of a stream is the
      // fence arriving, not code.
      if (!closed && streaming && body.length > 0 && /^ {0,3}(`{1,}|~{1,})$/.test(body[body.length - 1]!)) {
        const tail = body[body.length - 1]!.trim();
        if (tail[0] === marker[0]) body.pop();
      }
      // The empty line after a streamed newline hasn't got its text yet.
      if (!closed && streaming && body.length > 0 && body[body.length - 1] === "") body.pop();
      push(
        { type: "code", language: fence[2] || undefined, code: body.join("\n"), open: !closed },
        start,
        i,
      );
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      const level = heading[1]!.length as 1 | 2 | 3 | 4 | 5 | 6;
      i++;
      const open = streaming && i >= lines.length;
      // `#` with its text still on the way: an empty heading would open a
      // gap and then fill it. Wait for the text.
      if (open && !(heading[2] ?? "").trim()) continue;
      push({ type: "heading", level, children: parseInline(heading[2] ?? "", open) }, start, i);
      continue;
    }

    if (RULE.test(line)) {
      i++;
      push({ type: "rule" }, start, i);
      continue;
    }

    if (QUOTE.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && QUOTE.test(lines[i]!)) {
        inner.push(lines[i]!.replace(/^ {0,3}> ?/, ""));
        i++;
      }
      const streamingHere = streaming && i >= lines.length;
      push(
        { type: "blockquote", blocks: parseBlockLines(inner, streamingHere, false) as MarkdownBlock[] },
        start,
        i,
      );
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const result = parseList(lines, i, streaming);
      i = result.end;
      push(result.block, start, i);
      continue;
    }

    // GFM table: a row with a pipe, then a delimiter row.
    if (hasPipe(line) && i + 1 < lines.length && DELIMITER_ROW.test(lines[i + 1]!) && hasPipe(lines[i + 1]!) ) {
      const head = splitRow(line);
      const align = splitRow(lines[i + 1]!).map(alignOf);
      const width = head.length;
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && !isBlank(lines[i]!) && hasPipe(lines[i]!) && !interruptsParagraph(lines[i]!)) {
        rows.push(splitRow(lines[i]!));
        i++;
      }
      const open = streaming && i >= lines.length;
      push(
        {
          type: "table",
          align: pad(align, width, null),
          head: head.map((cell) => parseInline(cell, false)),
          rows: rows.map((row, r) =>
            pad(row, width, "").slice(0, width).map((cell, c) =>
              parseInline(cell, open && r === rows.length - 1 && c === row.length - 1),
            ),
          ),
        },
        start,
        i,
      );
      continue;
    }

    // Paragraph: runs until a blank line or a block that can interrupt it.
    const text: string[] = [line];
    i++;
    while (i < lines.length && !isBlank(lines[i]!) && !interruptsParagraph(lines[i]!)) {
      // A table can start mid-paragraph only at a fresh line followed by
      // a delimiter row; GFM forbids that, so it stays paragraph text.
      text.push(lines[i]!);
      i++;
    }
    const open = streaming && i >= lines.length;

    // A table whose header row has arrived but whose delimiter row is still
    // on its way: render the header now, so the block doesn't flip from a
    // paragraph of pipes to a table when the next line lands.
    if (
      open &&
      /^ {0,3}\|/.test(text[0]!) &&
      (text.length === 1 || (text.length === 2 && PARTIAL_DELIMITER_ROW.test(text[1]!)))
    ) {
      const head = splitRow(text[0]!);
      push(
        {
          type: "table",
          align: head.map(() => null),
          head: head.map((cell, c) => parseInline(cell, text.length === 1 && c === head.length - 1)),
          rows: [],
        },
        start,
        i,
      );
      continue;
    }

    push({ type: "paragraph", children: parseInline(joinParagraph(text), open) }, start, i);
  }

  return out;
}

function joinParagraph(lines: string[]): string {
  return lines.map((line) => line.trimStart()).join("\n").replace(/[ \t]+$/, "");
}

function pad<T>(list: T[], width: number, fill: T): T[] {
  const copy = list.slice(0, Math.max(width, 0));
  while (copy.length < width) copy.push(fill);
  return copy;
}

function alignOf(cell: string): MarkdownAlign {
  const value = cell.trim();
  const left = value.startsWith(":");
  const right = value.endsWith(":");
  if (left && right) return "center";
  if (right) return "right";
  if (left) return "left";
  return null;
}

/** Splits a table row on unescaped pipes outside code spans. */
function splitRow(line: string): string[] {
  let value = line.trim();
  if (value.startsWith("|")) value = value.slice(1);
  if (value.endsWith("|") && !value.endsWith("\\|")) value = value.slice(0, -1);
  const cells: string[] = [];
  let current = "";
  let inCode = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value[i]!;
    if (char === "\\" && value[i + 1] === "|") {
      current += "|";
      i++;
      continue;
    }
    if (char === "`") {
      let run = 1;
      while (value[i + run] === "`") run++;
      if (inCode === 0) inCode = run;
      else if (inCode === run) inCode = 0;
      current += value.slice(i, i + run);
      i += run - 1;
      continue;
    }
    if (char === "|" && inCode === 0) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function parseList(lines: string[], from: number, streaming: boolean): { block: MarkdownBlock; end: number } {
  const first = LIST_ITEM.exec(lines[from]!)!;
  const ordered = /^\d/.test(first[2]!);
  const start = ordered ? Number.parseInt(first[2]!, 10) : undefined;
  const items: string[][] = [];
  let tight = true;
  let i = from;
  let sawBlankBetween = false;

  while (i < lines.length) {
    const marker = LIST_ITEM.exec(lines[i]!);
    if (!marker || /^\d/.test(marker[2]!) !== ordered) break;
    if (sawBlankBetween) tight = false;
    sawBlankBetween = false;

    const indent = marker[1]!.length;
    const spaces = marker[3]!.length;
    const rest = lines[i]!.slice(marker[0].length);
    // 1–4 spaces after the marker set the content column; 5+ means the
    // content is indented code, which we treat as one space plus text.
    const contentOffset = indent + marker[2]!.length + (spaces >= 1 && spaces <= 4 && rest !== "" ? spaces : 1);
    const body: string[] = [lines[i]!.slice(Math.min(contentOffset, lines[i]!.length))];
    i++;
    let lastWasBlank = false;
    let inFence: string | null = FENCE.exec(body[0]!)?.[1] ?? null;

    while (i < lines.length) {
      const next = lines[i]!;
      if (isBlank(next)) {
        body.push("");
        lastWasBlank = true;
        i++;
        continue;
      }
      const leading = next.length - next.trimStart().length;
      const nested = LIST_ITEM.exec(next);
      // A marker indented past this item's own marker nests, even when it
      // falls short of the content column (`1. a` then `  - b`).
      const nests = nested !== null && nested[1]!.length > indent && !lastWasBlank;
      if (leading >= contentOffset || inFence || nests) {
        const stripped = next.slice(Math.min(contentOffset, leading));
        if (inFence) {
          const close = /^ {0,3}(`{3,}|~{3,})[ \t]*$/.exec(stripped);
          if (close && close[1]![0] === inFence[0] && close[1]!.length >= inFence.length) inFence = null;
        } else {
          inFence = FENCE.exec(stripped)?.[1] ?? null;
        }
        // A blank line inside an item, followed by more of the item.
        if (lastWasBlank) tight = false;
        body.push(stripped);
        lastWasBlank = false;
        i++;
        continue;
      }
      // Lazy continuation: an unindented line straight after paragraph text.
      if (!lastWasBlank && !interruptsParagraph(next) && !LIST_ITEM.test(next)) {
        body.push(next.trimStart());
        i++;
        continue;
      }
      break;
    }

    // Trailing blank lines belong between items, not to this item.
    while (body.length > 1 && body[body.length - 1] === "") body.pop();
    if (lastWasBlank) sawBlankBetween = true;
    items.push(body);
    if (lastWasBlank && (i >= lines.length || !LIST_ITEM.test(lines[i]!))) break;
  }

  // Back up over trailing blank lines so the caller resumes after the list.
  let end = i;
  while (end > from && isBlank(lines[end - 1]!)) end--;

  return {
    block: {
      type: "list",
      ordered,
      start,
      tight,
      items: items.map((body, index) => ({
        blocks: parseBlockLines(body, streaming && index === items.length - 1 && end >= lines.length, false) as MarkdownBlock[],
      })),
    },
    end,
  };
}

/* ------------------------------------------------------------------ */
/* Inlines                                                             */
/* ------------------------------------------------------------------ */

const PUNCTUATION = /[!-/:-@[-`{-~]/;
const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]{1,6}|#[0-9]{1,7}|[a-z]+);/gi, (match, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? Number.parseInt(body.slice(2), 16) : Number.parseInt(body.slice(1), 10);
      return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff) ? String.fromCodePoint(code) : "�";
    }
    return ENTITIES[body.toLowerCase()] ?? match;
  });
}

function isSpace(char: string | undefined): boolean {
  return char === undefined || /\s/.test(char);
}

function isPunct(char: string | undefined): boolean {
  return char !== undefined && PUNCTUATION.test(char);
}

function isWordChar(char: string | undefined): boolean {
  return char !== undefined && /[\p{L}\p{N}]/u.test(char);
}

function leftFlanking(before: string | undefined, after: string | undefined): boolean {
  if (isSpace(after)) return false;
  return !isPunct(after) || isSpace(before) || isPunct(before);
}

function rightFlanking(before: string | undefined, after: string | undefined): boolean {
  if (isSpace(before)) return false;
  return !isPunct(before) || isSpace(after) || isPunct(after);
}

/** Length of the run of `char` starting at `i`. */
function runLength(text: string, i: number, char: string): number {
  let n = 0;
  while (text[i + n] === char) n++;
  return n;
}

/** End index (exclusive) of the code span opening at `i`, or -1. */
function codeSpanEnd(text: string, i: number): number {
  const n = runLength(text, i, "`");
  let j = i + n;
  while (j < text.length) {
    const k = text.indexOf("`", j);
    if (k === -1) return -1;
    const m = runLength(text, k, "`");
    if (m === n) return k + m;
    j = k + m;
  }
  return -1;
}

/** Finds the `]` closing the `[` at `i`, skipping code spans and escapes. */
function closingBracket(text: string, i: number): number {
  let depth = 0;
  for (let j = i; j < text.length; j++) {
    const char = text[j];
    if (char === "\\") {
      j++;
      continue;
    }
    if (char === "`") {
      const end = codeSpanEnd(text, j);
      if (end !== -1) {
        j = end - 1;
        continue;
      }
    }
    if (char === "[") depth++;
    else if (char === "]") {
      depth--;
      if (depth === 0) return j;
    }
  }
  return -1;
}

/** Parses `(dest "title")` at `i`. Returns null if not (yet) a destination. */
function linkDestination(text: string, i: number): { href: string; title?: string; end: number } | null {
  if (text[i] !== "(") return null;
  let j = i + 1;
  while (text[j] === " " || text[j] === "\t") j++;
  let href = "";
  if (text[j] === "<") {
    const close = text.indexOf(">", j);
    if (close === -1) return null;
    href = text.slice(j + 1, close);
    j = close + 1;
  } else {
    let depth = 0;
    while (j < text.length) {
      const char = text[j]!;
      if (char === "\\" && j + 1 < text.length) {
        href += text[j + 1];
        j += 2;
        continue;
      }
      if (/\s/.test(char)) break;
      if (char === "(") depth++;
      if (char === ")") {
        if (depth === 0) break;
        depth--;
      }
      href += char;
      j++;
    }
  }
  while (text[j] === " " || text[j] === "\t" || text[j] === "\n") j++;
  let title: string | undefined;
  const quote = text[j];
  if (quote === '"' || quote === "'" || quote === "(") {
    const closeChar = quote === "(" ? ")" : quote;
    const close = text.indexOf(closeChar, j + 1);
    if (close === -1) return null;
    title = text.slice(j + 1, close);
    j = close + 1;
    while (text[j] === " " || text[j] === "\t") j++;
  }
  if (text[j] !== ")") return null;
  return { href, title, end: j + 1 };
}

const BARE_URL = /^(?:https?:\/\/|www\.)[^\s<]+/i;

/**
 * Parses inline Markdown. `open` marks text that may stop mid-construct
 * (the tail of a stream): unclosed emphasis and code close optimistically
 * at the end, and half-written links show only their text.
 */
export function parseInline(text: string, open = false): MarkdownInline[] {
  const nodes: MarkdownInline[] = [];
  let buffer = "";
  const flush = () => {
    if (buffer) {
      const last = nodes[nodes.length - 1];
      if (last && last.type === "text") last.text += decodeEntities(buffer);
      else nodes.push({ type: "text", text: decodeEntities(buffer) });
      buffer = "";
    }
  };
  const pushNode = (node: MarkdownInline) => {
    flush();
    nodes.push(node);
  };

  let i = 0;
  while (i < text.length) {
    const char = text[i]!;

    // Escapes and hard breaks.
    if (char === "\\") {
      const next = text[i + 1];
      if (next === "\n") {
        pushNode({ type: "break" });
        i += 2;
        continue;
      }
      if (next !== undefined && isPunct(next)) {
        // Escaped text is literal; keep it out of the entity decoder.
        flush();
        nodes.push({ type: "text", text: next });
        i += 2;
        continue;
      }
      if (next === undefined && open) {
        i++;
        continue;
      }
      buffer += char;
      i++;
      continue;
    }

    if (char === "\n") {
      // Two or more trailing spaces before a newline is a hard break.
      if (/ {2,}$/.test(buffer)) {
        buffer = buffer.replace(/ +$/, "");
        pushNode({ type: "break" });
      } else {
        buffer = buffer.replace(/ +$/, "");
        buffer += "\n";
      }
      i++;
      continue;
    }

    // Code spans.
    if (char === "`") {
      const n = runLength(text, i, "`");
      const end = codeSpanEnd(text, i);
      if (end !== -1) {
        let code = text.slice(i + n, end - n).replace(/\n/g, " ");
        if (/^ .*[^ ].* $/.test(code)) code = code.slice(1, -1);
        pushNode({ type: "code", text: code });
        i = end;
        continue;
      }
      if (open) {
        const code = text.slice(i + n).replace(/\n/g, " ");
        if (code) pushNode({ type: "code", text: code.replace(/^ (?=.*[^ ])/, "") });
        i = text.length;
        continue;
      }
      buffer += text.slice(i, i + n);
      i += n;
      continue;
    }

    // Links and images (images become links: never auto-loaded).
    if (char === "[" || (char === "!" && text[i + 1] === "[")) {
      const image = char === "!";
      const bracket = image ? i + 1 : i;
      const close = closingBracket(text, bracket);
      if (close !== -1) {
        const label = text.slice(bracket + 1, close);
        const destination = linkDestination(text, close + 1);
        if (destination) {
          const href = safeHref(destination.href);
          const children = image
            ? [{ type: "text" as const, text: label || destination.href }]
            : parseInline(label, false);
          pushNode({ type: "link", href, title: destination.title, children });
          i = destination.end;
          continue;
        }
        // `[text](` still arriving: show the text, hide the destination.
        if (open && (close + 1 === text.length || (text[close + 1] === "(" && !text.slice(close + 1).includes(")")))) {
          pushNode({ type: "link", href: null, children: image ? [{ type: "text", text: label }] : parseInline(label, true) });
          i = text.length;
          continue;
        }
      } else if (open && !text.slice(bracket).includes("]")) {
        // `[text` still arriving: show the text without the bracket, already
        // in the (href-less) link it will most likely become, so its words
        // don't move into a new element when the destination lands.
        pushNode({ type: "link", href: null, children: parseInline(text.slice(bracket + 1), true) });
        i = text.length;
        continue;
      }
      buffer += char;
      i++;
      continue;
    }

    // Autolinks: <https://…> and <mailto:…>.
    if (char === "<") {
      const auto = /^<((?:https?|mailto):[^\s<>]*)>/i.exec(text.slice(i));
      if (auto) {
        const href = safeHref(auto[1]!);
        pushNode({ type: "link", href, children: [{ type: "text", text: auto[1]! }] });
        i += auto[0].length;
        continue;
      }
      buffer += char;
      i++;
      continue;
    }

    // Bare URLs at a word boundary (GFM's extended autolink).
    if ((char === "h" || char === "H" || char === "w" || char === "W") && !isWordChar(text[i - 1])) {
      const bare = BARE_URL.exec(text.slice(i));
      if (bare) {
        let url = bare[0];
        // Trailing punctuation belongs to the sentence, not the URL…
        url = url.replace(/[?!.,:*_~'"]+$/, "");
        // …and so does an unbalanced closing paren.
        while (url.endsWith(")") && (url.match(/\)/g)?.length ?? 0) > (url.match(/\(/g)?.length ?? 0)) url = url.slice(0, -1);
        if (url.length > (url.toLowerCase().startsWith("www.") ? 4 : 8)) {
          const href = safeHref(url.toLowerCase().startsWith("www.") ? `https://${url}` : url);
          pushNode({ type: "link", href, children: [{ type: "text", text: url }] });
          i += url.length;
          continue;
        }
      }
    }

    // Emphasis: *em*, _em_, **strong**, __strong__, ~~del~~.
    if (char === "*" || char === "_" || char === "~") {
      const n = runLength(text, i, char);
      const before = text[i - 1];
      const after = text[i + n];
      const canOpen =
        leftFlanking(before, after) &&
        (char !== "_" || !rightFlanking(before, after) || isPunct(before)) &&
        (char !== "_" || !isWordChar(before));
      if (char === "~" && n !== 2 && n !== 1) {
        buffer += text.slice(i, i + n);
        i += n;
        continue;
      }
      if (canOpen) {
        const match = matchEmphasis(text, i, char, n, open);
        if (match) {
          pushNode(match.node);
          i = match.end;
          continue;
        }
        // Markers at the very end of a stream with nothing after them yet.
        if (open && i + n === text.length) {
          i = text.length;
          continue;
        }
      } else if (open && i + n === text.length) {
        // Markers with nothing after them yet (`text **`): they could open
        // emphasis once the next chunk lands. Hide them until they mean
        // something.
        i = text.length;
        continue;
      }
      buffer += text.slice(i, i + n);
      i += n;
      continue;
    }

    buffer += char;
    i++;
  }

  flush();
  // Escapes and half-written links push text separately; merge neighbours
  // so a run of text is always one node.
  const merged: MarkdownInline[] = [];
  for (const node of nodes) {
    const last = merged[merged.length - 1];
    if (node.type === "text" && last?.type === "text") merged[merged.length - 1] = { type: "text", text: last.text + node.text };
    else merged.push(node);
  }
  return merged;
}

function matchEmphasis(
  text: string,
  i: number,
  char: string,
  n: number,
  open: boolean,
): { node: MarkdownInline; end: number } | null {
  const tries = char === "~" ? [Math.min(n, 2)] : n >= 3 ? [3, 2, 1] : n === 2 ? [2, 1] : [1];
  for (const use of tries) {
    const close = findCloser(text, i + use, char, use);
    if (close !== -1) {
      const inner = text.slice(i + use, close);
      if (!inner) continue;
      const leftover = n - use;
      const node = emphasisNode(char, use, parseInline(inner, false));
      // Opening run longer than what closed (e.g. `**a*`): the extra
      // markers are literal text in front.
      if (leftover > 0) {
        return {
          node: { type: "text", text: text.slice(i, i + leftover) },
          end: i + leftover,
        };
      }
      return { node, end: close + use };
    }
  }

  // Streaming: an opener with no closer yet runs to the end of the input,
  // but only at a word start, so `2*3` mid-stream doesn't flash italics.
  if (open && !isWordChar(text[i - 1])) {
    const use = char === "~" ? 2 : Math.min(n, 3);
    if (char === "~" && n < 2) return null;
    const inner = text.slice(i + use);
    if (!inner.trim()) return null;
    return { node: emphasisNode(char, use, parseInline(inner, true)), end: text.length };
  }
  return null;
}

function emphasisNode(char: string, use: number, children: MarkdownInline[]): MarkdownInline {
  if (char === "~") return { type: "del", children };
  if (use === 3) return { type: "strong", children: [{ type: "em", children }] };
  if (use === 2) return { type: "strong", children };
  return { type: "em", children };
}

/** Finds the start of a closing run of `char` able to close `use` markers. */
function findCloser(text: string, from: number, char: string, use: number): number {
  const stack: number[] = [];
  for (let j = from; j < text.length; j++) {
    const c = text[j];
    if (c === "\\") {
      j++;
      continue;
    }
    if (c === "`") {
      const end = codeSpanEnd(text, j);
      if (end !== -1) {
        j = end - 1;
        continue;
      }
    }
    if (c === "[") {
      const close = closingBracket(text, j);
      if (close !== -1) {
        const destination = linkDestination(text, close + 1);
        if (destination) {
          // A link binds tighter than emphasis: markers inside it never
          // close an emphasis opened outside it.
          j = destination.end - 1;
          continue;
        }
      }
    }
    if (c !== char) continue;
    const m = runLength(text, j, char);
    const before = text[j - 1];
    const after = text[j + m];
    let canClose = rightFlanking(before, after);
    let canOpen = leftFlanking(before, after);
    if (char === "_") {
      canClose = canClose && (!canOpen || isPunct(after)) && !isWordChar(after);
      canOpen = canOpen && (!canClose || isPunct(before)) && !isWordChar(before);
    }
    if (char === "~" && m !== use) {
      j += m - 1;
      continue;
    }
    if (canClose) {
      if (stack.length > 0) {
        const top = stack.pop()!;
        const excess = m - top;
        if (excess >= use) return j + m - use;
        j += m - 1;
        continue;
      }
      if (m >= use) return j + m - use;
      // A shorter closer can't close us, but may close a nested opener's
      // partner later; skip past it.
    }
    if (canOpen) stack.push(m);
    j += m - 1;
  }
  return -1;
}
