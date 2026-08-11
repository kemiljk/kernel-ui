# Sheet

Ported from [astro-kejk#83](https://github.com/kemiljk/astro-kejk/pull/83), then
extended against [magic-spells/bottom-sheet](https://github.com/magic-spells/bottom-sheet).

## Round one — the component

- [x] Gesture engine (`utils/sheetDrag.ts`, both packages): velocity dismissal,
      damped overdrag, scroll arbitration, pointer-capture click suppression.
- [x] `Sheet` + `<kernel-sheet>`, composing `Dialog` so the modal layer stays the
      platform's. `Dialog` unmodified.
- [x] Registry entry, docs page, demo, playground, tests.
- [x] `PointerEvent` shim in the React test setup — jsdom has none, so
      `fireEvent.pointerDown` was silently dropping coordinates.

## Round two — from the reference implementation

- [x] **Mid-gesture handoff.** The engine decided once and killed the gesture if
      a scroller had room, so pulling a list to its top and continuing did
      nothing. Now re-asked every move against the *instantaneous* direction,
      with travel measured from the handoff so it doesn't jump. Subsumed the
      scroll-lock timeout, which is gone along with `scrollLockTimeout`.
- [x] **Windowed velocity.** Was `travel / elapsed` over the whole gesture, which
      read a drag that stopped dead as a flick and reported the direction a
      reversed drag came *from*. Now a 100ms window with reversal walk-back.
      `velocityThreshold` moved 0.11 → 0.5 to match; the measure and the
      threshold only mean anything as a pair.
- [x] **`inset`** — detached, four rounded corners, CSS only.
- [x] **`maxDisplayWidth`** — closes itself above a viewport width.
- [x] **Footer slot** — pinned below a scrolling body, owns the bottom safe area.
- [x] **Snap points** — height-driven, `dvh`, flick steps one, nearest on a slow
      release, dismiss below the shortest. `side="bottom"` only.
- [x] **Spring settle** — closed-form damped oscillator, frame-rate independent.

## Review

Two decisions worth remembering.

**Snapping inverts the engine's founding invariant** — that it never owns the
resting position — so it does so only when asked. No snap points: translate, CSS
transitions, unchanged. With them: `height` in `dvh`, because a snap *is* a
height, which is what keeps a footer pinned and the scroll region correctly
sized. Below the shortest snap, height pins and travel returns to `translate`,
so dismissal is one code path in both modes.

**The spring is deliberately the only one.** Kernel's baseline is CSS
transitions and that still holds for everything reversible; a settle is the sole
case needing an initial velocity, which no curve can express.
`--kernel-ease-spring` now says so, so it isn't read as "where Kernel does
springs".

### Cost worth recording

The opening snap has to arrive as an *option*, not an imperative `snapTo` after
mount. The node reaches the engine through a callback ref, so the engine attaches
a render later than the component's effects — an imperative call on mount silently
no-ops and the sheet opens at the wrong height. That one cost real time.

### Verified

- 82 tests across 12 files; typecheck and build clean in both packages;
  `registry:check`; `astro check` in `apps/docs`.
- Browser: handoff (240px pull, only the 100px after the edge moved the sheet);
  all four sides; damped overdrag (300px → 124px); inset geometry at 420px
  (12px gap, four rounded corners); footer flush at 0px with the dialog's own
  bottom padding dropped to 0; snapping drag driving height; slow release landing
  on the nearest snap; spring settling to `55dvh` = 495px exactly.

### Not verified

- `prefers-reduced-motion` — no emulation in the tooling.
- Spring smoothness at 60fps, and whether per-frame `height` writes hold that
  frame rate. The preview pane throttles rAF (7 frames in 1.2s), so this session
  cannot claim to have observed it. Worth a look on a real device.
- The flick and dismissal snap rules were confirmed by unit tests with an
  injected clock rather than in the browser, because the pane can't produce a
  controlled release velocity.

## Also fixed along the way

- `Button` hardcoded `data-slot="button"` after spreading props, so `Dialog`'s
  documented `dialog-close` hook didn't exist in the React DOM while
  `<kernel-dialog>` emitted it correctly.
- Every React island on the docs site failed to hydrate, in dev and production,
  because `apps/docs`'s `CommandPalette` gated its portal on
  `typeof document !== "undefined"`. One island's mismatch took the others with
  it; every demo on the site was inert.
- `registry` gained `llmsNote`, so long-form component detail in
  `packages/react/llms.txt` survives `registry:build` instead of being deleted by
  the next regeneration.

## Not done

Vaul-style `activeSnapPoint` snapping on `side="top" | "left" | "right"`, and
migrating astro-kejk onto the published component.
