# @kernelui-lib/elements

## 1.3.1

### Patch Changes

- 4609935: Breadcrumb links now meet the WCAG 2.2 AA minimum target size.

  The link had no block padding, so its hit area was exactly its 21px line
  box at `--kernel-font-size-sm` — under the 24px floor in SC 2.5.8. Since
  breadcrumbs are a nav list rather than links inside a sentence, the
  inline-target exception doesn't apply.

  The item now guarantees a 24px minimum height and the link stretches into
  it, instead of the link growing itself with padding: the `/` separators
  are siblings in the same centred flex row, so padding on the link alone
  would have pushed them off the text's centre line, and it would have
  changed breadcrumb density for every consumer. Text position is
  unchanged; the row is 3px taller and the focus ring wraps a correctly
  sized box.

- 4609935: Guard `Breadcrumbs`, `Nav`, and `Pagination` hover styles behind
  `@media (hover: hover) and (pointer: fine)`, matching the React package.

  Without the guard, `:hover` latches on touch devices: tapping a breadcrumb,
  nav link, or pagination control left it stuck in its hover state until
  something else was tapped. The React versions of all three were already
  guarded — this closes the parity gap, so the two packages now render
  identically on touch.

## 1.3.0

### Minor Changes

- e6e6d27: Add composable CommandPalette and Combobox APIs with controlled queries, grouped rich options, external filtering, stable active IDs, disabled items, and loading/empty states. Improve scroll-area composition and grouped option styling across the paired packages.

## 1.2.0

### Minor Changes

- 3f1b3d1: Add the two code surfaces an agent UI needs, with no new dependency in either
  package.

  `CodeBlock` is a real `<pre><code>` in a `<figure>`: line numbers, emphasised
  lines, copy with a live-region announcement, and streaming that stays stable —
  lines are keyed by index, so appending output updates the last line instead of
  re-mounting the ones above it, which is what avoids the flicker and lost text
  selection you get from re-rendering a growing block as one string. Following
  the live edge reuses `StickToBottomController`.

  `FileDiff` renders a file's changes as a real `<table>` inside a `<details>`,
  because a diff _is_ tabular data. Line numbers live in their own unselectable
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

- 3f1b3d1: Add the conversation surfaces an agent UI needs on top of `Composer`.

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

- 3f1b3d1: Add the two surfaces that show an agent's work in progress.

  `TodoList` / `TodoItem` is a task plan: a native `<details>` over a real
  `<ol>`, with the completion count on the summary so a collapsed plan still
  reports progress. All four status marks render at once and cross-fade on
  `data-status`, so a status change is one attribute write with no JS in the
  transition — and every item carries its status as real, visually hidden text,
  because a shape and a colour are not a label. The count is derived from the
  items themselves (via `MutationObserver` in the custom element), so updating a
  task's status is the only thing a consumer has to do.

  `AgentActivity` / `AgentActivityItem` is one chronological stream of reasoning,
  searches, tool calls and traces, as a real `<ol>`. Reasoning and tool steps
  delegate their bodies to the existing `Reasoning` and `ToolCall` components
  rather than reimplementing disclosure, streaming and status behaviour, so those
  two stay the single source of truth and stay usable standalone.

  The `<details>`-based additions are covered by the repo's frame-by-frame
  disclosure motion check.

- 28295f0: `Composer` moves to `--kernel-radius-container` with its paired curve padding.
  It reads as an input, but it _holds_ controls — a send button, action slots — and
  a box that holds pill controls has to be concentric with them or they read as
  bulging out of its corners. At `--kernel-radius-md` the composer's own curvature
  was close enough to the send button's that the two corners fought at Round. The
  container tier is only usable here because the curve padding comes with it:
  that's what stops a modest two-line box reading as a stadium pill, which is what
  went wrong the first time this tier was tried.
- 060500c: Pair every derived corner radius with a padding that scales like it, and stop
  clickable surfaces selecting their own text.

  `--kernel-radius-container`/`-sheet` are derived _from_ the padding tokens, so
  the radius grows with a consumer's `--kernel-radius-base` while a hand-picked
  `--kernel-space-*` stays flat: correct at the default rounding, cramped text in
  a large curve at Round. `--kernel-padding-container-curve` and
  `--kernel-padding-sheet-curve` are the padding halves of those pairings — the
  flat value plus the same proportional term the radius already has (nothing extra
  at Sharp, +50% at Round). `CodeBlock`, `FileDiff`, `TodoList` and
  `MessageScroller` now use them, `Toast` reads the token instead of restating the
  calculation, and `CommandPalette` is paired properly for the first time (it
  combined the sheet radius with a hand-picked `--kernel-space-4`, so its input
  crowded the corner at large radii).

  `MessageBubble` moves to `--kernel-radius-lg`: a bubble is a text box, not a
  padded container, and the container tier rounded a two-line bubble hard enough
  to read as an accidental pill — the same call `Composer` and `Textarea` already
  made. A bubble that fits on one line now gets a real pill instead, via the new
  `observeLineFit`/`useLineFit` utility, since CSS can't ask how many lines an
  element rendered on.

  `user-select: none` now covers every clickable surface that was missing it: the
  new agent components' triggers, plus `Checkbox`, `Switch`, `RadioGroup`,
  `Pagination`, `DropdownMenu` links, `FileUpload`'s remove button, `ColorPicker`'s
  swatch label and `Button` rendered as a link. A double-click on those no longer
  selects their labels.

  Both conventions are now stated as rules in `AGENTS.md` and enforced by
  `bun run test:shape`.

  Corner clearance, not just padding: a rounded control only reads as nested when
  its inset is at least `outer radius − its own radius`. `CodeBlock`'s copy button
  sat 8px from a 36px curve at Round and visibly collided with it. Every box that
  _meets_ a rounded corner — a header bar's top and inline edges, a summary row,
  the last row of a panel, all four sides of a scroll container — now takes the
  curve padding, while interior edges stay tight.

  A message bubble's own padding scales with its own corner too, derived from
  `--kernel-radius-lg` rather than a global, and only for the wrapped and
  expandable cases — a single-line pill's curve only eats the space above and
  below a centred line, so the flat padding is already clear of it there.

### Patch Changes

- Updated dependencies [060500c]
  - @kernelui-lib/styles@1.2.0

## 1.1.0

### Minor Changes

- Ship AI surface components (Suggestion, Sources, ToolCall, Reasoning), motion baseline tokens, FileUpload previews, `data-slot` hooks for headless/unstyled consumers, and overlay exit polish (Dialog sheets, popovers, tooltips).

### Patch Changes

- Updated dependencies
  - @kernelui-lib/styles@1.1.0

## 1.0.0

### Major Changes

- Accessible components built on real semantic HTML. Ships as React, Custom Elements, and a shared token layer.

### Patch Changes

- Updated dependencies
  - @kernelui-lib/styles@1.0.0
