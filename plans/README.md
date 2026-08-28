# Animation audit plans

Deep audit at commit `4292c7f`, covering all animated surfaces in React, Custom Elements, shared styles, and the docs site against the eight `improve-animations` categories. Product code was not changed.

## Recommended execution order

| Order | Plan | Severity | Status | Depends on |
| --- | --- | --- | --- | --- |
| 1 | [001 — Make Command Palette open and close instantly](001-make-command-palette-instant.md) | HIGH | DONE | — |
| 2 | [002 — Make menu selection highlights instant](002-make-menu-selection-instant.md) | HIGH | DONE | — |
| 3 | [003 — Keep Resizable drag updates out of render loops](003-keep-resizable-out-of-render-loop.md) | HIGH | DONE | — |
| 4 | [004 — Make Toast swipe frame-native](004-make-toast-swipe-frame-native.md) | HIGH | DONE | — |
| 5 | [005 — Morph ToolCall status in place](005-morph-toolcall-status.md) | LOW | DONE | Finish corrective work first |

Plans 001–004 are independent and can execute in parallel. Plan 005 is additive polish and should land after the corrective work so performance/frequency regressions are not obscured by new motion.

All five plans were implemented in the working tree and verified with the full React test suite, both package typechecks/builds, the shape checker, Astro diagnostics, and an interactive Round-radius browser pass.

## Vetted corrective findings

| # | Severity | Category | Location | Finding | Fix summary |
| --- | --- | --- | --- | --- | --- |
| 1 | HIGH | Purpose & frequency | CommandPalette CSS/TS in both packages | Shortcut-driven panel animates 200ms in / 150ms out | Make native dialog open/close immediate |
| 2 | HIGH | Purpose & frequency | DropdownMenu item CSS in both packages | 120ms background transition trails arrow-key focus; ContextMenu reuses it | Keep press scale, make selection fill instant |
| 3 | HIGH | Performance | Resizable TS/TSX | Pointermove runs React state/full Elements render | Write live split + ARIA directly, commit at gesture boundary |
| 4 | HIGH | Performance | Toast TS/TSX + CSS | Per-pixel React state and inherited swipe custom property sit in gesture path | Write non-inheriting `translate` directly |
| 5 | MEDIUM | Easing & duration | `detailsTransition.ts` twins | Visible height/padding morph reads `--kernel-ease-out` despite the token contract naming `--kernel-ease-in-out` for this case | Switch measured disclosure easing to in-out |
| 6 | MEDIUM | Easing & duration | Progress CSS twins | Infinite sweep repeatedly decelerates; determinate size morph also uses entrance easing | Use linear for indeterminate and in-out for determinate |
| 7 | MEDIUM | Easing & duration | Shared tokens + color transitions across components/docs | Strong entrance curve is reused for hover/color/background micro-interactions | Add/use a color-interaction curve after a separate inventory plan |
| 8 | MEDIUM | Performance | FileUpload CSS twins | Preview morph animates container padding and relayouts descendants | Replace padding tween with a bounded visual frame/FLIP treatment |
| 9 | MEDIUM | Cohesion | Toast CSS twins | Timed/close-button dismissal fades in place instead of returning toward entry edge | Give ordinary exit the same downward spatial model as entry |
| 10 | MEDIUM | Accessibility | CodeBlock, MessageScroller, Sheet handle CSS twins | Bare hover rules can latch on touch | Gate hover rules behind hover/fine-pointer media query |

Tabs' 220–560ms magnetic indicator, Toast's expressive 0.8 entrance, FileDiff/Message insertion keyframes, and Sheet's height-driven snap settle were reviewed and intentionally not filed because their source comments document deliberate trade-offs. The disclosure animator's layout work was also not filed as a performance defect: a real variable-height semantic panel cannot preserve surrounding flow with a compositor-only transform; only its incorrect easing survives the audit.

## Vetted missed opportunities

| Priority | Confidence | Location | Opportunity | Pattern |
| --- | --- | --- | --- | --- |
| 1 | High | ToolCall, both packages | Morph running dots/shimmer into settled icon/text | transitions.dev icon swap; planned in 005 |
| 2 | High | CodeBlock copy, Carousel controls, FileUpload remove, MessageScroller jump, Toast close | Add the existing `--kernel-scale-press` feedback where hover exists but press does not | Kernel baseline, no heavier recipe |
| 3 | High | Docs CopyButton and markdown URL chip | Stack copy/check icons instead of conditional/display swap | transitions.dev icon swap; copy CodeBlock |
| 4 | Medium-high | DatePicker and DateRangePicker, both packages | Give month changes a small direction-aware cross-blur | transitions.dev page-side-by-side, reduced to 8px |
| 5 | Medium | AgentActivity, both packages | Settle live status color changes | Kernel 120ms color transition only |
| 6 | Medium | FileUpload selected-file rows | Preserve continuity on add/remove without replaying survivors | Small list-item transition, not panel reveal |
| 7 | Medium-high | Docs homepage hero | Establish reading hierarchy on the rare entrance | Existing Kernel stagger tokens; no uniform stagger |

## Later-plan boundary

The unplanned survivors above are deliberately retained here. The first execution batch is capped at five self-contained plans by leverage; create one plan per remaining finding after the first batch is feel-checked so the library does not absorb a sweeping motion rewrite without evidence.
