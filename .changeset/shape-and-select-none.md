---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Pair every derived corner radius with a padding that scales like it, and stop
clickable surfaces selecting their own text.

`--kernel-radius-container`/`-sheet` are derived *from* the padding tokens, so
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
*meets* a rounded corner — a header bar's top and inline edges, a summary row,
the last row of a panel, all four sides of a scroll container — now takes the
curve padding, while interior edges stay tight.
