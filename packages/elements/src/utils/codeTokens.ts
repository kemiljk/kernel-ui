/**
 * The one shape Kernel's code surfaces read: pre-tokenised lines.
 *
 * `CodeBlock` and `FileDiff` accept these instead of highlighting anything
 * themselves, which is what keeps `@kernelui-lib/elements` dependency-free and
 * keeps this package from needing an async highlighter. Bring
 * Shiki, Prism, Highlight.js, a server-side highlighter, or nothing at all —
 * a plain `code` string renders as one unstyled token per line.
 *
 * `className` is for highlighters that emit classes (and for theming from
 * your own stylesheet); `color` is for the ones that emit inline colours,
 * which is what Shiki's `codeToTokens` gives you.
 */
export interface CodeToken {
  text: string;
  className?: string;
  color?: string;
}

export interface CodeLine {
  tokens: CodeToken[];
}

/** Plain, un-highlighted lines from a source string. Splitting on `\n` (and
 * tolerating `\r\n`) is the whole job — a trailing newline yields a trailing
 * empty line, which is what the file actually contains. */
export function linesFromCode(code: string): CodeLine[] {
  return code.split("\n").map((line) => ({
    tokens: [{ text: line.replace(/\r$/, "") }],
  }));
}

/** The text a line would copy as. */
export function lineText(line: CodeLine): string {
  let text = "";
  for (const token of line.tokens) text += token.text;
  return text;
}

/** The text a whole block would copy as. */
export function linesText(lines: CodeLine[]): string {
  return lines.map(lineText).join("\n");
}
