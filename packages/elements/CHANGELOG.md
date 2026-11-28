# @kernelui-lib/elements

## 1.7.0

### Minor Changes

- b881838: Add five components, each in both packages: `Kbd` (keyboard keys and shortcuts on nested `<kbd>`, with a platform-aware `mod` key), `EmptyState` (a zero-data `<section>` named by its own heading), `ToolApproval` (approve / deny / always-allow before an agent runs a tool, with the outcome announced in a live region), `Attachment` + `AttachmentList` (file chips with middle-truncated names, `Intl` file sizes, image previews, native `<progress>` upload and a remove button), and `UsageMeter` (token or credit usage on a styled native `<meter>` with warning and danger bands). Also exports `formatFileSize`, `usageMeterLevel` and `resolveKbdKey` (React).
- 2547241: Ship agent skills with the packages, and add `kernel agents`.
  
  - `@kernelui-lib/react` now includes `skills/kernel-ui`, `skills/kernel-ui-theming` and `skills/kernel-ui-migrate`. `@kernelui-lib/elements` includes `skills/kernel-ui-elements`. They use the Agent Skills format (`SKILL.md`), are versioned with the code, and carry the `tanstack-intent` keyword.
  - `kernel agents` installs those skills into `.claude/skills` (or `--dir`), preferring the installed packages' copies. It registers the MCP server (`--client`), and adds a Kernel UI section to `AGENTS.md`, and to `CLAUDE.md` if present. Running it again replaces that section rather than duplicating it.
  - Fix: `kernel mcp init` no longer reads an unrelated flag as the client name.
- 30d6fe4: Translatable built-in strings, and DOM parity fixes between the two packages.
  
  - Every built-in English string (close buttons, "Remove {tag}", Copy/Copied, month navigation, pagination, carousel controls, and more) can now be overridden. React components take `labels?: Partial<<Name>Labels>` with an exported `<Name>Labels` type. Custom Elements read `label-<key>` attributes (`{param}` placeholders for interpolated strings) or a `labels` property. The defaults are unchanged.
  - Elements now write `data-*` state hooks as `"true"`, like React, instead of `""`. They also omit `aria-invalid` and `data-loading` when false, use React's `data-opening` → `data-open` sequence on `<kernel-dialog>`, and put `data-disabled` on the `<kernel-toggle>`/`<kernel-switch>` button.
  - `<kernel-toggle>` forwards `aria-label` to its button. `<kernel-radio-group>` gains a `value` attribute for the selected item.
  - React `TagInput` chips carry `data-tag`, matching the element.
  - React `Suggestion`'s `disabled` now disables every chip, so they can't be reached by keyboard. Before, it only blocked the pointer.
  - Elements no longer emit `kernel-Accordion-title` or `kernel-Callout-content`. No styles target either class, and React never emitted them.
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
- f9f0f36: Optical Button, plus icon slots for `<kernel-button>`.
  
  - Button's radius stops at half the control height, so it's a true pill at Round, and its inline padding grows by the width the corners cut away.
  - Capitals are centred by cap height, so fonts with lopsided metrics don't sit low.
  - Icons sit in a slot concentric with the corner, drawn at `--kernel-icon-size` and spaced from the label by the same distance as from the edge.
  - Icon-only buttons are now square at every size, or a circle at Round. They used to be wider than tall.
  - A lone `<svg>` or `<img>` passed as `children` is treated as icon-only. A component child is always treated as the label; pass icon components through `iconStart`/`iconEnd`.
  - `<kernel-button>` now supports icons: an `svg`, `img` or `data-icon` child placed first or last moves into an icon slot, matching React's `iconStart` and `iconEnd`. It also forwards `aria-label` to the real `<button>`.
  - The Dialog close button is now an icon-only Button in both packages.
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
- ab40f50: Make both packages better npm citizens.
  
  - `@kernelui-lib/react`'s bundle now starts with `"use client"`, so Next.js App Router Server Components can import Kernel directly.
  - Both packages add an opt-in `styles.layer.css` export: the same component CSS inside `@layer kernel.components`, ordered after `@kernelui-lib/styles`' token and reset layers, so any unlayered CSS you write overrides Kernel without specificity fights. `styles.css` is unchanged.
  - `@kernelui-lib/elements` ships a Custom Elements Manifest (`custom-elements.json`, named by the `customElements` field), VS Code HTML custom data (`vscode.html-custom-data.json`) and React 19 JSX types for every tag (`@kernelui-lib/elements/jsx`), all generated from the elements' source.

### Patch Changes

- 09c7227: Contrast fixes, measured with APCA (the method proposed for WCAG 3) with WCAG 2 as a floor.
  
  - **Focus ring:** `--kernel-color-focus-ring` is now accent-11. Accent-9 failed in light mode for the amber preset (1.95:1), and every preset scored about Lc 30 in dark mode.
  - **New `--kernel-color-border-control` token:** gray-9 in light, gray-11 in dark, for controls whose border is their only outline. Checkbox, Radio and the Switch track now use it, where they used to measure 1.66:1 in light mode.
  - **Muted text:** gray-11 is lighter in dark mode (78%, up from 72%), so muted text clears Lc 60.
  - **Checkbox at Round:** its radius is capped, so it no longer turns into a circle that looks like a radio button.
  - **Switch in RTL:** the thumb now moves by its logical inset, so it sits on the left when on in right-to-left layouts.
  - **Sheet in RTL:** the left/right edge bleed now also flips under `dir="rtl"`. The build had compiled its `:dir(rtl)` rule down to RTL `lang` selectors only.
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
- 10b4dfb: Accessibility fixes found by the new axe check:
  
  - ScrollArea, CodeBlock and FileDiff's scrolling regions can now be reached and scrolled by keyboard. CodeBlock and FileDiff name their region.
  - DatePicker and DateRangePicker now use the ARIA grid pattern correctly. The table has `role="grid"`, `aria-selected` moved from the day button to its gridcell, and today's button gets `aria-current="date"`.
- Updated dependencies [09c7227]
- Updated dependencies [f5773b8]
- Updated dependencies [4e6f9fd]
- Updated dependencies [1ad7bd1]
- Updated dependencies [f334806]
  - @kernelui-lib/styles@1.5.0

## 1.6.2

### Patch Changes

- 2c79835: Use pointer cursors consistently for enabled click controls, including buttons, tabs, menu options, and disclosure triggers. Preserve text-editing, drag, resize, and disabled-state cursors.
- Updated dependencies [2c79835]
  - @kernelui-lib/styles@1.4.1

## 1.6.1

### Patch Changes

- 3347f80: Tabs re-measures its selection indicator whenever the tab list changes size. A tab list first rendered inside a hidden container (a closed dialog, popover or `<details>`) used to measure every tab as 0px wide and show a zero-width sliver with no selected highlight until the selection changed; it now snaps into place when the container opens, and also follows font loading or the container resizing.

## 1.6.0

### Minor Changes

- 9c181a0: Tables are mobile-friendly. `Table` (and `<kernel-table>`) now renders its `<table>` inside a horizontal scroll container, so a wide table scrolls in place instead of widening the page on a phone; `className` still targets the table and the new `wrapperClassName` targets the container. An edge fade and inset shadow show which side still has content to scroll to, driven by a CSS scroll-driven animation. DataTable gets the same scroll container, its pagination wraps (centred) when the page links don't fit on one line, and the filter field gains a real placeholder: `filterPlaceholder` (`filter-placeholder`) now sets it, with a new `filterLabel` (`filter-label`) for the visible label, which falls back to `filterPlaceholder` as before. Pagination's page list wraps instead of overflowing.
- 9c181a0: Surface-aware fills. New `--kernel-color-fill-subtle`, `--kernel-color-fill` and `--kernel-color-fill-strong` tokens back every well, track and hover background (Tabs, inset and default Slider, Progress, Skeleton, Toggle, Pagination, date pickers, Table row hover, Avatar, Badge, Carousel, Toast). Card re-sets them one grey step up and raised containers (Dialog, Sheet, Popover, HoverCard, DropdownMenu, ContextMenu, NavigationMenu, Toast, CommandPalette, Combobox and Select popups) two, so a Tabs track or Slider keeps its contrast instead of disappearing into a raised surface of the same grey.
  
  ScrollArea's `edgeShadow` is now driven by a CSS scroll-driven animation (same 48px ramp); its scroll listener only runs as a fallback in browsers without scroll timelines.

### Patch Changes

- Updated dependencies [9c181a0]
  - @kernelui-lib/styles@1.4.0

## 1.5.0

### Minor Changes

- 6b93625: Add shared control tokens: `--kernel-control-height-sm/md/lg`, `--kernel-control-inset` and `--kernel-radius-control-inner` (control radius minus inset, so nested pieces stay concentric at every theme rounding). Button, Toggle, TextField, NumberField, Select, Combobox, ColorPicker, Pagination, Carousel and CommandPalette now read the height tokens instead of literal values.
  
  Tabs now follows `--kernel-radius-control`: the list uses the control radius and height, and tabs and the indicator use `--kernel-radius-control-inner`, so a tab list is square at Sharp and a pill at Round, matching the buttons beside it. `TabsList` also takes `shape="pill"` (`shape="pill"` on `<kernel-tabs-list>`) for a fully rounded list whatever the theme.
  
  Slider gains `variant="inset"` (`variant="inset"` on `<kernel-slider>`): a full-height track filled with the accent colour, dragged by a slim bar, with optional `startLabel`/`endLabel` (`start-label`/`end-label`) captions that change colour where the fill crosses them. When the drag bar would land on a caption, the bar steps aside at rest and the caption steps aside while the slider is hovered, dragged or keyboard-focused. The default slider's fill now lines up with the thumb's centre, its focus ring shows again in Chromium and Safari, and server-rendered sliders show the right fill before hydration.
  
  Shape drift fixes: Pagination items use `--kernel-radius-control` like every other control; Combobox and CommandPalette options are now concentric with the surface around them (as Select's options already were); Switch derives its thumb gap from `--kernel-control-inset` and is square when the theme's control radius is 0 (still a pill in any rounded theme).

### Patch Changes

- Update development dependencies: Vite 8.3.5, `@testing-library/user-event` 14.6.8 and Node.js 26.6.5 types.
- da1063a: Update the package build dependencies to Vite 8.3 and Node.js 26.6 types.
- Updated dependencies [6b93625]
  - @kernelui-lib/styles@1.3.0

## 1.4.3

### Patch Changes

- f5387cb: Enhance single selects with a native, token-styled picker when appearance: base-select and ::picker(select) are supported. Preserve the existing control styling, chevron, and platform picker fallback, and leave multiple selects and listboxes unchanged.

## 1.4.2

### Patch Changes

- ae364da: Give every inline SVG icon intrinsic `width`/`height` attributes matching its styled size. Without component CSS, an SVG with only a `viewBox` renders at the browser default of 300×150, so a Select or Accordion chevron could push the whole form off-screen. Styled rendering is unchanged.

## 1.4.1

### Patch Changes

- 5d5fb03: Move disclosure-menu reveal motion onto the native `::details-content` box so entry and exit animate on every toggle, including repeated touch interactions in Chromium and WebKit.

## 1.4.0

### Minor Changes

- 34c3a9e: Add `presentation="disclosure"` to DropdownMenu for menus anchored within their parent, including fixed mobile navigation. A native details/summary owns toggling and CSS owns repeated entry/exit, without a top-layer backdrop, scroll locking, or JavaScript animation timers. Both packages retain keyboard roving, disabled items, Escape/outside dismissal, selection and reduced-motion behavior. Render a summary trigger; the default popover presentation is unchanged.

## 1.3.2

### Patch Changes

- 92f832d: Prevent Sidebar from exposing unintended horizontal scrolling.
- c08e43b: Make high-frequency command surfaces immediate, keep direct-manipulation gestures off render loops, and add a persistent ToolCall status morph.
- 92f832d: Update development tooling dependencies.
- b5624a0: Stop tap flash and accidental text selection on clickable controls.
  
  The reset now includes `label` (tapping a checkbox label highlighted the
  label, not the input) plus the widget roles, kills the iOS long-press
  callout on chrome, and sets `user-select: none` on buttons, summaries, and
  labels. React and Web Components pair `-webkit-user-select` everywhere
  selection is suppressed, including nav, breadcrumbs, and chips. Links stay
  selectable so copying their text still works.
- Updated dependencies [b5624a0]
  - @kernelui-lib/styles@1.2.1

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
