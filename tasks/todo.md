# Vite config modernization

- [x] Replace CommonJS `__dirname` usage in both package Vite configs with the native ESM equivalent.
- [x] Verify React and Elements builds with Vite's current and future native config loaders, confirming the warning is gone.
- [x] Run the affected typechecks/docs build, review the diff, and commit/push the standalone config change to `main`.

## Review

Replaced `__dirname` with `import.meta.dirname` in both package configs. Vite
8 requires Node 20.19+ while the native ESM property is available from Node
20.11+, so the supported runtime floor covers it. React and Elements build
cleanly with both Vite's current bundled config loader and explicit
`--configLoader native`; the prior warning is gone in both modes. Both package
typechecks pass, Astro reports zero findings across 244 files, and the 71-page
docs production build succeeds. The output is unchanged, so this build-config
only change does not require a Changeset.

# Dependabot cleanup and main push

- [x] Inventory every open Dependabot PR, including package scope, version delta, CI state, mergeability, and release notes/security impact.
- [x] Merge relevant compatible PRs and close superseded, duplicate, or irrelevant PRs with an explicit reason.
- [x] Reconcile the updated remote `main` with all current local work and review the complete diff.
- [x] Run the full relevant test, typecheck, build, registry, shape, and docs verification suite.
- [x] Commit and push all remaining work to `main`, then confirm the remote branch and PR queue state.

## Review

Reviewed the two remaining Dependabot PRs. Merged #47 (Astro 7.2.6 and
`@astrojs/react` 6.0.4) after fresh CI, then added the required Changeset to
#50, resolved its post-#47 lockfile conflict, and merged Vite 8.2.2,
`@types/node` 26.3.0, and `@types/react-dom` 19.2.5 after another clean CI
run. Both were relevant, so none were discarded. Security review found no
issues, the proposed dependencies introduced no new known advisories, and
both Vercel previews passed.

The combined tree passes frozen install, all package builds/typechecks, the
60-entry registry consistency check, shape checks, 123 React tests, 10 CLI
tests, Astro diagnostics (244 files, zero findings), and the 71-page docs
build. The Mac was locked during the final browser smoke attempt; the existing
Default motion review below records the completed Round-radius interaction
pass for these same UI changes. The release workflow is non-publishable; the
component/tooling changes include their required Changesets.

# Changesets v2 release workflow fix

- [x] Fast-forward the local branch to the latest `origin/main` without disturbing existing worktree changes.
- [x] Remove obsolete Changesets action input names and retain the v2 equivalents.
- [x] Validate the workflow syntax/configuration and review the final diff.

## Review

Fast-forwarded `main` from `294dd4e` to `92f832d` after temporarily stashing
and cleanly restoring the existing tracked and untracked work. Updated the five
inputs renamed by `changesets/action@v2` while preserving their values and the
release scripts. The workflow parses as YAML, a focused assertion confirms the
exact v2 input set, `git diff --check` passes, and no other Changesets action
usage exists in `.github/workflows`. This workflow-only change is
non-publishable, so it does not require a Changeset.

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

# Favicon asset fix

- [x] Compare the docs favicon asset/link with the working `astro-kejk` site.
- [x] Fix the root cause with the smallest docs-only change.
- [x] Run Astro diagnostics/build and inspect the emitted favicon response.

## Review

The original SVG and Astro route were valid, but Kernel depended on that single
format while `astro-kejk` supplies browser and platform fallbacks. Added a 32px
PNG, 32px ICO, and 180px Apple touch icon generated from the same amber mark,
then declared them alongside the SVG with a version query to clear persistent
favicon caches.

`astro check` passed with 244 files and zero findings; the production build
completed with 71 pages. The emitted HTML contains all four links and each
asset has the expected format. A local production browser check loaded
`/favicon.svg?v=2` successfully with no console errors; the server also saw the
browser request both the SVG and conventional `/favicon.ico` paths.

This is docs-only, so no Changeset is required.

# Default motion pass

- [x] Make CommandPalette open and close immediately in React and Elements.
- [x] Make DropdownMenu and ContextMenu selection fills immediate while retaining press feedback.
- [x] Keep Resizable pointermove updates out of React/Elements render loops.
- [x] Keep Toast swipe movement out of React state and inherited custom properties.
- [x] Morph ToolCall running and settled status layers in place with reduced-motion support.
- [x] Add focused regression coverage and a patch Changeset for both publishable packages.
- [x] Typecheck, test, build, run shape/docs checks, and interactively verify the affected surfaces.

## Review

Implemented all five audited plans in both packages. CommandPalette and menu
selection now prioritize keyboard immediacy; Resizable and Toast keep pointer
movement out of render loops; ToolCall uses persistent status/text layers with
hidden ambient loops paused. Added thirteen focused regression tests across the
new CommandPalette, Resizable, Toast, and ToolCall paths, plus the existing menu
navigation coverage.

Verified 123 React tests, React and Elements typechecks/builds,
`test:shape`, and Astro diagnostics (243 files, zero findings). In the browser,
checked CommandPalette's zero-duration resting styles, menu items' scale-only
transition, Resizable keyboard updates, Toast directional swipe dismissal, and
ToolCall running/error layer states at the Round radius setting. The browser
could not synthesize the native dialog Escape cancellation reliably; that path
is covered by the focused cancel event regression test.

# Docs integration fixes and deployment

- [x] Preserve the ToolCall instance when playground status changes so the morph is visible.
- [x] Remount the uncontrolled Resizable only when its `defaultSplit` control changes.
- [x] Mount one shared Toast viewport for the page so demo actions do not duplicate toasts.
- [x] Re-run package tests/typechecks/builds, Astro checks/build, and production browser smoke tests.
- [x] Deploy the verified production build and confirm the live site.

## Review

Fixed all three docs integration defects. The ToolCall playground now preserves
component identity across status/result changes, Resizable remounts only when
`defaultSplit` changes, and Toast demo/playground actions share exactly one
viewport. Re-ran 123 React tests, both package typechecks/builds, shape checks,
Astro diagnostics/build, and local browser interaction checks.

Deployed preview `dpl_F5vZKSmDzP294v4NitGvs6xzHmt3`, promoted it to production
as `dpl_Ei8gmXMqqJBX1L1CcmhaaKLFA1ri`, and confirmed the deployment reached
READY. On `www.kernelui.com`, verified one Toast viewport/one Toast, ToolCall's
running state, Resizable's updated split, and one open Command Palette dialog.
The post-deploy Vercel error scan returned no logs/errors; the site is static.
