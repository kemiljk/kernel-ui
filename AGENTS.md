# Working in this repo

This is a monorepo for a component library built on real semantic HTML.
Read `README.md` for the project pitch. This file is operational
guidance for anyone (human or agent) making changes here.

For **consuming** the published packages, don't read this file — read
`packages/react/llms.txt` or `packages/elements/llms.txt` instead; they're
the API reference. This file is about *building* the library, not using it.

## The one rule that matters most: build every component twice

Every component ships in **both** `@kernelui-lib/react` (`packages/react/src/components/<Name>/`)
and `@kernelui-lib/elements` (`packages/elements/src/components/<Name>/`) — a
React version and a framework-free Custom Element version, with matching
visual design and equivalent props/attributes. Adding a component to only
one package is an incomplete PR, not a smaller one. Before considering any
new component done, grep both `packages/react/src/index.ts` and
`packages/elements/src/index.ts` for its export.

## Repo layout

- `packages/react` — `@kernelui-lib/react`. Each component: `<Name>.tsx` +
  `<Name>.module.css`, exported from `src/index.ts` in shipping order
  (not alphabetical — new exports go at the end, before the `polymorphic`
  utils export block).
- `packages/elements` — `@kernelui-lib/elements`. Each component: `<Name>.ts`
  (extends `KernelElement` from `../../base`, registers via
  `customElements.define`) + `<Name>.css`, exported from `src/index.ts`.
  CSS class names use `kernelClass("Name", "part")`, which produces the
  **exact same class names** React's CSS Modules compile to (see
  `packages/react/vite.config.ts`'s `generateScopedName`) — this is
  deliberate, so one set of component styles serves both packages.
- `packages/styles` — `@kernelui-lib/styles`. Design tokens
  (`tokens.css`) and reset (`reset.css`). Both packages' components read
  tokens from here; never hardcode a color/spacing/radius value in a
  component's own CSS.
- `apps/docs` — Astro docs site. Each component needs: an entry in
  `packages/registry` (re-exported by `apps/docs/src/data/components.ts`),
  a page at `src/pages/components/<slug>.astro`, and
  `src/components/demos/<Name>Demo.tsx` + `<Name>Playground.tsx`. Copy the
  structure of an existing page (`text-field.astro`/`scroll-area.astro` are
  good recent examples) rather than inventing a new layout.
- `packages/registry` — shared component catalog consumed by docs, CLI, and
  LLM asset generation. Run `bun run build` there after changing entries.
- `packages/cli` — `@kernelui-lib/cli`. Published integration CLI (`kernel init`,
  `kernel doctor`, `kernel docs`).

## Conventions to match, not reinvent

- Controlled/uncontrolled state: `value`/`defaultValue`/`onValueChange`
  via `useControllableState` (`packages/react/src/utils/useControllableState.ts`).
- `label`/`hideLabel`/`description`/`errorMessage`/`invalid`/`disabled`
  scaffold for form fields — copy `TextField.tsx`'s structure.
  `hideLabel` visually hides the label via the shared `kernel-sr-only`
  utility class (`packages/styles/src/reset.css`) — never actually drop
  `label` from the DOM; an unlabeled input is an accessibility bug, not
  a simplified one.
- `className`/`wrapperClassName` + `resolveClassName`/`dataAttr`/`mergeRefs`
  from `packages/react/src/utils/polymorphic.ts`.
- Real elements over ARIA-only patterns wherever a native element exists.
  Every component's top JSDoc comment explains *why* it's built the way
  it is (which native element, which ARIA pattern, what tradeoff) — write
  one for every new component; this is a strict, load-bearing convention,
  not decoration (it's also what agents read via package `llms.txt` and the
  docs site's generated markdown mirrors).
- Icons are hand-authored inline `<svg>` with `stroke="currentColor"`
  (see `Toast.tsx`'s close icon or `Checkbox.tsx`'s checkmark) — no icon
  library dependency in either package.
- **Shape baseline — a radius is never picked on its own.** Every corner
  radius in the library has a padding it must be paired with, because
  `--kernel-radius-container`/`-sheet` are *derived from* the padding
  tokens (`radius-md + padding-*`), so the radius grows with a consumer's
  `--kernel-radius-base` while a hand-picked `var(--kernel-space-3)`
  doesn't. That's the drift: it looks fine at the default radius and reads
  as cramped text jammed into a giant curve at Round. The pairings, all
  three mandatory:

  | `border-radius` | padding it must use |
  | --- | --- |
  | `--kernel-radius-container` | `--kernel-padding-container-curve` |
  | `--kernel-radius-sheet` | `--kernel-padding-sheet-curve` |
  | `--kernel-radius-control` / `-md` / `-lg` | any `--kernel-space-*` |

  Only the third row is free, because those radii don't scale off a
  padding token. Concretely: if a rule sets
  `border-radius: var(--kernel-radius-container)`, every rule that pads
  *against that box's edge* — its own `padding`, a header bar inside it, a
  row's outermost cells — uses `--kernel-padding-container-curve`, not a
  raw space token. `CodeBlock`, `FileDiff`, `TodoList` and `Toast` are the
  worked examples.

  A text box is not a container. `Composer`, `Textarea` and
  `MessageBubble` read `--kernel-radius-md`/`-lg` deliberately: at
  `-container` a two-line box rounds hard enough to read as an accidental
  pill. If you want a real pill on one line and a large corner on many,
  the height is not knowable in CSS — use `utils/lineFit.ts`, which marks
  the element `data-lines="single" | "multi"` (see `MessageBubble`).
- **Anything you click needs `user-select: none`.** Triggers, summaries,
  menu items, tabs, chips, segment buttons, the lot — a double-click on a
  disclosure otherwise selects its label, which is never what the click
  was for, and a drag from a control selects text across the page. Pair it
  with `-webkit-user-select: none` for Safari. Same rule for gutters that
  aren't content: line numbers and diff markers are `user-select: none` so
  a copy contains code, not decoration.
- **Motion baseline** (tokens in `packages/styles/src/tokens.css`, craft
  bar from [transitions.dev](https://transitions.dev/) + Emil): enter with
  `--kernel-ease-overlay` / `--kernel-ease-out`, never `ease-in` on
  entrances; exit faster than enter (`--kernel-duration-exit` /
  `--kernel-duration-exit-fast`); never `scale(0)` — use
  `--kernel-scale-enter` / `--kernel-scale-exit`; origin-aware overlays
  via `--kernel-transform-origin`; CSS transitions (not keyframes) for
  reversible UI; enumerate transition properties. `popover="manual"`
  surfaces exit via `usePopoverExit` + `[data-closing]` *before*
  `hidePopover()`; `popover="auto"` exits rely on Chromium's `overlay`
  transition, with Safari guarded in `reset.css`. Prefer shared tokens
  over per-component duration/easing literals.

## Known gotchas (hit these once already; don't re-hit them)

- **The docs site consumes `dist/`, not `src/`.** After changing
  `packages/react` or `packages/elements`, run `bun run build` in that
  package *before* checking the docs site in a browser — the Astro dev
  server resolves `@kernelui-lib/react`/`@kernelui-lib/elements` through their
  built output, not live TypeScript source.
- **Custom props named `onError`/`onChange`/etc. collide with native
  `HTMLAttributes`.** If a component's props extend
  `InputHTMLAttributes<HTMLInputElement>` (or similar) and you add a prop
  called `onError`, `Omit` it from the extended interface explicitly —
  otherwise TypeScript unifies your custom callback's signature with the
  native DOM event handler's and fails to compile.
- **Don't call a state setter in a loop expecting it to accumulate.**
  `useControllableState`'s setter isn't a functional updater — calling it
  more than once synchronously in the same event handler (e.g. splitting
  pasted text into several committed values) means every call reads the
  same pre-update closure value, and only the last call's result sticks.
  Fold the whole batch into one local value first, then call the setter
  once (see `TagInput.tsx`'s `commitParts` for the fixed pattern, and
  its own comment for why the naive loop version was wrong).
- **Test with real computed styles, not raw screenshots or naive
  `document.activeElement`/DOM-property assumptions.** React's
  controlled-input value tracking means directly setting
  `input.value = x` from outside React (test scripts, browser eval) often
  doesn't trigger the component's own `onChange` — use the native
  property descriptor's setter (`Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, x)`)
  before dispatching a synthetic `input`/`change` event.

## Before calling a component done

- `bun run typecheck` in both `packages/react` and `packages/elements`.
- `bun run build` in both (docs won't see the change otherwise).
- `astro check` in `apps/docs` (`bun run typecheck` there).
- `bun run test:shape` (`scripts/check-shape-pairing.mjs`) — fails on any rule that adopts
  `--kernel-radius-container`/`-sheet` without its paired padding token,
  and on any `cursor: pointer` block with no `user-select: none`. Both are
  the mistakes the Shape and select-none rules above exist to stop, and
  both are invisible until someone switches the theme to Round or
  double-clicks a disclosure.
- Actually open the docs page in a browser and interact with it — typecheck
  passing proves the types line up, not that the feature works. Switch the
  docs site's radius to **Round** while you're there: it's the setting that
  exposes a wrong radius/padding pairing immediately.
