# @kernelui-lib/styles

## 1.4.0

### Minor Changes

- 9c181a0: Surface-aware fills. New `--kernel-color-fill-subtle`, `--kernel-color-fill` and `--kernel-color-fill-strong` tokens back every well, track and hover background (Tabs, inset and default Slider, Progress, Skeleton, Toggle, Pagination, date pickers, Table row hover, Avatar, Badge, Carousel, Toast). Card re-sets them one grey step up and raised containers (Dialog, Sheet, Popover, HoverCard, DropdownMenu, ContextMenu, NavigationMenu, Toast, CommandPalette, Combobox and Select popups) two, so a Tabs track or Slider keeps its contrast instead of disappearing into a raised surface of the same grey.
  
  ScrollArea's `edgeShadow` is now driven by a CSS scroll-driven animation (same 48px ramp); its scroll listener only runs as a fallback in browsers without scroll timelines.

## 1.3.0

### Minor Changes

- 6b93625: Add shared control tokens: `--kernel-control-height-sm/md/lg`, `--kernel-control-inset` and `--kernel-radius-control-inner` (control radius minus inset, so nested pieces stay concentric at every theme rounding). Button, Toggle, TextField, NumberField, Select, Combobox, ColorPicker, Pagination, Carousel and CommandPalette now read the height tokens instead of literal values.
  
  Tabs now follows `--kernel-radius-control`: the list uses the control radius and height, and tabs and the indicator use `--kernel-radius-control-inner`, so a tab list is square at Sharp and a pill at Round, matching the buttons beside it. `TabsList` also takes `shape="pill"` (`shape="pill"` on `<kernel-tabs-list>`) for a fully rounded list whatever the theme.
  
  Slider gains `variant="inset"` (`variant="inset"` on `<kernel-slider>`): a full-height track filled with the accent colour, dragged by a slim bar, with optional `startLabel`/`endLabel` (`start-label`/`end-label`) captions that change colour where the fill crosses them. When the drag bar would land on a caption, the bar steps aside at rest and the caption steps aside while the slider is hovered, dragged or keyboard-focused. The default slider's fill now lines up with the thumb's centre, its focus ring shows again in Chromium and Safari, and server-rendered sliders show the right fill before hydration.
  
  Shape drift fixes: Pagination items use `--kernel-radius-control` like every other control; Combobox and CommandPalette options are now concentric with the surface around them (as Select's options already were); Switch derives its thumb gap from `--kernel-control-inset` and is square when the theme's control radius is 0 (still a pill in any rounded theme).

## 1.2.7

### Patch Changes

- 0d32c0b: Restore system font defaults and remove bundled brand fonts from the published package. The Kernel website now owns its font files separately. The legacy fonts.css entry remains an empty compatibility import.

## 1.2.6

### Patch Changes

- 8bf220f: Refine KK Sans section, infinity, currency, and editorial symbols across upright and italic weights.

## 1.2.5

### Patch Changes

- 5d5e9ce: Refine 28 KK Sans currency, editorial, fraction, prime, and mathematical glyphs across all weights and italics. Keep counters and identifying bars clear in Bold and Black, improve symbol proportions and spacing, and preserve the existing 325-character coverage.

## 1.2.4

### Patch Changes

- 080c33b: Expand KK Sans to 325 encoded characters, adding 68 currency, editorial, fraction, spacing, and raised-figure characters across every weight and italic style. Preserve existing glyphs and spacing.

## 1.2.3

### Patch Changes

- ed52077: Improve punctuation weight and comma clarity in KK Sans and KK Mono.

## 1.2.2

### Patch Changes

- f32dfb6: Use bundled KK Sans and KK Mono webfonts throughout Kernel, including variable weights and italic faces.

## 1.2.1

### Patch Changes

- b5624a0: Stop tap flash and accidental text selection on clickable controls.
  
  The reset now includes `label` (tapping a checkbox label highlighted the
  label, not the input) plus the widget roles, kills the iOS long-press
  callout on chrome, and sets `user-select: none` on buttons, summaries, and
  labels. React and Web Components pair `-webkit-user-select` everywhere
  selection is suppressed, including nav, breadcrumbs, and chips. Links stay
  selectable so copying their text still works.

## 1.2.0

### Minor Changes

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

## 1.1.0

### Minor Changes

- Ship AI surface components (Suggestion, Sources, ToolCall, Reasoning), motion baseline tokens, FileUpload previews, `data-slot` hooks for headless/unstyled consumers, and overlay exit polish (Dialog sheets, popovers, tooltips).

## 1.0.0

### Major Changes

- Accessible components built on real semantic HTML. Ships as React, Custom Elements, and a shared token layer.
