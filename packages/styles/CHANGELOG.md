# @kernelui-lib/styles

## 1.5.0

### Minor Changes

- 09c7227: Contrast fixes, measured with APCA (the method proposed for WCAG 3) with WCAG 2 as a floor.
  
  - **Focus ring:** `--kernel-color-focus-ring` is now accent-11. Accent-9 failed in light mode for the amber preset (1.95:1), and every preset scored about Lc 30 in dark mode.
  - **New `--kernel-color-border-control` token:** gray-9 in light, gray-11 in dark, for controls whose border is their only outline. Checkbox, Radio and the Switch track now use it, where they used to measure 1.66:1 in light mode.
  - **Muted text:** gray-11 is lighter in dark mode (78%, up from 72%), so muted text clears Lc 60.
  - **Checkbox at Round:** its radius is capped, so it no longer turns into a circle that looks like a radio button.
  - **Switch in RTL:** the thumb now moves by its logical inset, so it sits on the left when on in right-to-left layouts.
  - **Sheet in RTL:** the left/right edge bleed now also flips under `dir="rtl"`. The build had compiled its `:dir(rtl)` rule down to RTL `lang` selectors only.
- 4e6f9fd: Motion pass, following Emil Kowalski's animation principles.
  
  - **Reduced motion now works as intended.** The reset no longer forces every transition to near zero: in a layer with `!important`, that override defeated every component's gentler reduced-motion variant. Busy spinners and indeterminate progress, marked `data-kernel-motion="essential"`, now slow down instead of freezing.
  - **New tokens:** `--kernel-scale-enter-lg`, `--kernel-scale-recede`, `--kernel-ease-drawer`, `--kernel-duration-sheet`, `--kernel-ease-loop`, `--kernel-duration-spin`, `--kernel-duration-pulse` and `--kernel-duration-shimmer`. `--kernel-ease-in-out` is now the stronger `cubic-bezier(0.77, 0, 0.175, 1)`.
  - **Tooltip:** opens after 400ms by default (was 0). Once one tooltip has shown, its neighbours open instantly with no enter transition.
  - **Dialog:** enters from 0.98 and exits to 0.99. Side panels and Sheet travel on the iOS drawer curve. Fixed a duplicated `translate` transition.
  - **Toast:** exits faster than it enters, dropping back toward its edge, and its stack scales use tokens.
  - **ContextMenu:** pops open from the cursor with a short fade and overshoot. The elements ContextMenu and Combobox now play their exit animation before closing, matching React.
  - **Disclosures** (Accordion, Reasoning, ToolCall, FileDiff…): the height now uses the in-out curve, and the content fades with it, including when you reverse mid-way.
  - **Select:** the customizable picker fades and scales in.
  - **Loops:** every loading loop uses the shared tokens.
  - **Other fixes:**
    - The Checkbox draw is quicker.
    - The FileUpload drop wash blooms with a `clip-path` from the pointer, replacing an inherited scale from 0.001.
    - The Message entrance uses the translate token.
    - CodeBlock copy, Toast close and the MessageScroller jump button have press feedback.
    - CodeBlock's copy hover is gated to devices that hover.
    - Carousel's smooth scrolling respects reduced motion.
- 1ad7bd1: Optical pills for Badge, TagInput tags and Suggestion items.
  
  - Icons go straight in as children, before or after the text or on their own, from any icon set. An icon at either end becomes a `1lh` slot, concentric with the rounded end.
  - Inline padding grows by the width the rounded ends cut away.
  - The radius stops at a true half-height pill, so a wrapped Suggestion keeps its one-line end caps instead of turning into a stadium.
  - Capitals are centred by cap height, so fonts with lopsided ascent and descent metrics no longer sit low.
  - New tokens: `--kernel-icon-size`, `--kernel-icon-stroke-width` and `--kernel-pill-cut`.
  - `<kernel-badge>` now follows `--kernel-radius-control` like React's `Badge` (it was always a pill).
  - `<kernel-tag-input>` tags now share Badge's styles, matching React.
  - Suggestion items are now 40px tall on one line, the md control height, down from about 43px.
- f334806: Optical-pill rollout to fields and the remaining pill-shaped controls, plus focus and danger tokens.
  
  - **Fields at Round:** TextField (and so DataTable's filter), Select, Combobox, NumberField, TagInput's field and ColorPicker's hex field add the optical-pill label edge to their text inset, so text no longer jams into a pill's end cap. Their label, description and error move by the same amount and keep lining up with the text. At the default radius this is about 0.7px; at Sharp it is 0.
  - **TagInput:** one row is now exactly the control height (40px, was 46.8px), and its corners stop at the one-row radius when the field wraps.
  - **NumberField:** the stacked up/down chevrons are now inline − and + buttons. Each is at least 24×24 (30×30 at md), sits concentric with the field's corner and nests inside the end cap at Round. The buttons are in the order − then +.
  - **Toggle and NavigationMenu** use Button's optical-pill recipe: label-edge padding, cap-height centring, and concentric icon slots. Toggle detects icon children like Badge and Button do, so an icon-only toggle stays square, or a circle at Round. Toggle now sets its font size per `size`, matching Button.
  - **Heights snapped to the control scale:** Suggestion 40px (was 40.6px), NavigationMenu items 40px (was 37.3px), CodeBlock's copy button 32px (was 31.3px).
  - **New tokens:** `--kernel-focus-offset` (2px), `--kernel-focus-offset-inset` (−2px) and `--kernel-focus-offset-tight` (1px) replace hard-coded `outline-offset` values, and `--kernel-color-danger-hover` (danger step 10, light/dark aware) replaces Button's `color-mix(… black)` danger hover.
  - **Slider:** the track thickness is a component-local `--track-size`, and the range inputs set `user-select: none`, as does ColorPicker's colour input.

### Patch Changes

- f5773b8: Fix layout, RTL and hit-area issues from a design audit.
  
  - **Tabs**: a tablist wider than its container now scrolls sideways (hidden scrollbar, an edge fade only where tabs are cut off) instead of widening the page, and selecting a tab scrolls it into view. The sliding indicator now lands on the selected tab in right-to-left layouts.
  - **InputOTP**: cells share the row (up to 48px each, never under 2rem) and stay square, so six cells fit on a 390px screen.
  - **Pagination** (and DataTable's footer): stays on one line. Below a 30rem container width, Previous/Next show only their chevrons; the word stays available to assistive tech. The nav now fills its container's width and centres its pages.
  - **Slider**: the fill meets the thumb in RTL.
  - **Directional icons**: new `[data-icon-directional]` utility in `reset.css` mirrors an icon in RTL. DatePicker/DateRangePicker month arrows, Carousel prev/next and the Sources external-link arrow use it.
  - **New token** `--kernel-color-overlay-hover`, a currentColor-based hover wash that stays visible in both colour schemes. TagInput's remove button uses it in place of a fixed black overlay that disappeared in dark mode.
  - **Hit areas**: Carousel dots, citation chips and the Resizable divider keep their visual size but have a 24px target. DataTable sort buttons and Message's expand trigger are at least 24px tall. Carousel dots now sit on a 24px pitch.
  - **Citation chips**: a small pill that fits two digits, raised without changing line height, with no gap before following punctuation.
  - **AgentActivity**: its disclosure chevron sits at the end edge, like the nested Reasoning and ToolCall rows.
  - **Toast**: descriptions on success, warning and danger toasts use the variant's text colour.
  - **Resizable**: panes use the container radius, and the divider has a visible grip.

## 1.4.1

### Patch Changes

- 2c79835: Use pointer cursors consistently for enabled click controls, including buttons, tabs, menu options, and disclosure triggers. Preserve text-editing, drag, resize, and disabled-state cursors.

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
