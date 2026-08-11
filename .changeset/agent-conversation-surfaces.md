---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add the conversation surfaces an agent UI needs on top of `Composer`.

`MessageScroller` is a reader-aware transcript viewport: it follows streamed
output at the live edge and releases control the moment the reader scrolls
away, with a jump control to re-pin. Pin state is derived from scroll position
alone, and is deliberately not a controlled prop — it answers "is the reader at
the bottom?", which only the DOM knows. The behaviour core ships too, as
`StickToBottomController` (framework-free) and the `useStickToBottom` hook, for
any surface that follows growing content.

`MessageList` / `Message` / `MessageBubble` are the transcript itself: a real
`<ol>` of `<li>`s wrapping `<article>`s, so readers can jump message to message
in the article rotor. Rows carry an author, avatar, name, metadata, grouping,
and a live marker; bubbles carry a tone, an alignment independent of the
author, and an optional `expandable` disclosure built on the same
`DetailsPanelAnimator` as Accordion. New rows animate in exactly once, on
mount, so re-rendering a long transcript never re-animates its history.
