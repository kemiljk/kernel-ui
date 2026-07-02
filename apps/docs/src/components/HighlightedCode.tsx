import { Fragment, type ReactNode } from "react";

/** Ordered so the FIRST matching alternative wins for any given position —
 * comments/strings before anything that could match inside them, tag
 * names before the bare-word attribute-name pattern so `<Button` isn't
 * misread as an attribute. */
const TOKEN_PATTERN =
  /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(<\/?[A-Za-z][\w.]*)|([{}])|(\b(?:import|from|export|default)\b)|([a-zA-Z_][\w-]*(?=\s*=))|(\/?>)/g;

/** Position N here maps to capture group N+1 in TOKEN_PATTERN above —
 * same --astro-code-token-* variables Shiki's own "css-variables" theme
 * (used by every other <Code> block on the site) writes to, so this and
 * a real Shiki block are indistinguishable. */
const TOKEN_COLORS = [
  "var(--astro-code-token-comment)", // // comment
  "var(--astro-code-token-string)", // "string"
  "var(--astro-code-token-function)", // <Tag / </Tag
  "var(--astro-code-token-punctuation)", // { or }
  "var(--astro-code-token-keyword)", // import/from/export/default
  "var(--astro-code-token-constant)", // attr=
  "var(--astro-code-token-punctuation)", // /> or >
];

interface HighlightedCodeProps {
  code: string;
}

/**
 * A small, dependency-free stand-in for Shiki (Astro's `<Code>`, used for
 * every other code block on the site) for the one case Shiki genuinely
 * can't cover: Playground's Usage snippet regenerates on every click, in
 * the browser, from live component state — Shiki only ever runs at build
 * time, over static strings. Tokenises just enough of JSX/HTML (tags,
 * attributes, strings, braces, a handful of keywords) to read as
 * properly highlighted, not a full parser — these are short, generated
 * usage snippets, not arbitrary source, so a regex pass is enough.
 */
export function HighlightedCode({ code }: HighlightedCodeProps) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  let key = 0;

  for (const match of code.matchAll(TOKEN_PATTERN)) {
    const index = match.index ?? 0;
    if (index > lastIndex) nodes.push(code.slice(lastIndex, index));

    const groupIndex = match.slice(1).findIndex((group) => group !== undefined);
    nodes.push(
      <span key={key++} style={{ color: TOKEN_COLORS[groupIndex] }}>
        {match[0]}
      </span>,
    );
    lastIndex = index + match[0].length;
  }

  if (lastIndex < code.length) nodes.push(code.slice(lastIndex));

  return <Fragment>{nodes}</Fragment>;
}
