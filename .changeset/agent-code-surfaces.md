---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add the two code surfaces an agent UI needs, with no new dependency in either
package.

`CodeBlock` is a real `<pre><code>` in a `<figure>`: line numbers, emphasised
lines, copy with a live-region announcement, and streaming that stays stable —
lines are keyed by index, so appending output updates the last line instead of
re-mounting the ones above it, which is what avoids the flicker and lost text
selection you get from re-rendering a growing block as one string. Following
the live edge reuses `StickToBottomController`.

`FileDiff` renders a file's changes as a real `<table>` inside a `<details>`,
because a diff *is* tabular data. Line numbers live in their own unselectable
cells so copying a diff copies the code; the `+`/`−` marker stays in the DOM as
text, because colour alone can't say whether a line was added or removed. With
`collapseOnComplete` the disclosure holds open while rows arrive and settles
closed a beat after they stop — on the streaming edge only, so a manual reopen
is never overridden.

Both highlight nothing themselves: they take pre-tokenised lines
(`CodeLine`/`CodeToken` from `utils/codeTokens`, also exported with
`linesFromCode`/`linesText`), so Shiki, Prism, a server-side highlighter or
plain text all work and neither package grows a dependency. In the elements
package that data arrives through DOM properties (`lines`, `code`, `rows`),
with light-DOM `<pre><code>` as `<kernel-code-block>`'s progressive-enhancement
fallback.
