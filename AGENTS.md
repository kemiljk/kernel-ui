# Working in this repo

This is a monorepo for a component library built on real semantic HTML.
Read `README.md` for the project pitch. This file is operational
guidance for anyone (human or agent) making changes here.

For **consuming** the published packages, don't read this file — read
`packages/react/llms.txt` or `packages/elements/llms.txt` instead; they're
the API reference. This file is about *building* the library, not using it.

## The one rule that matters most: build every component twice

Every component ships in **both** `@kernelui/react` (`packages/react/src/components/<Name>/`)
and `@kernelui/elements` (`packages/elements/src/components/<Name>/`) — a
React version and a framework-free Custom Element version, with matching
visual design and equivalent props/attributes. Adding a component to only
one package is an incomplete PR, not a smaller one. Before considering any
new component done, grep both `packages/react/src/index.ts` and
`packages/elements/src/index.ts` for its export.

## Repo layout

- `packages/react` — `@kernelui/react`. Each component: `<Name>.tsx` +
  `<Name>.module.css`, exported from `src/index.ts` in shipping order
  (not alphabetical — new exports go at the end, before the `polymorphic`
  utils export block).
- `packages/elements` — `@kernelui/elements`. Each component: `<Name>.ts`
  (extends `KernelElement` from `../../base`, registers via
  `customElements.define`) + `<Name>.css`, exported from `src/index.ts`.
  CSS class names use `kernelClass("Name", "part")`, which produces the
  **exact same class names** React's CSS Modules compile to (see
  `packages/react/vite.config.ts`'s `generateScopedName`) — this is
  deliberate, so one set of component styles serves both packages.
- `packages/styles` — `@kernelui/styles`. Design tokens
  (`tokens.css`) and reset (`reset.css`). Both packages' components read
  tokens from here; never hardcode a color/spacing/radius value in a
  component's own CSS.
- `apps/docs` — Astro docs site. Each component needs: an entry in
  `src/data/components.ts` (alphabetical by `name`), a page at
  `src/pages/components/<slug>.astro`, and `src/components/demos/<Name>Demo.tsx`
  + `<Name>Playground.tsx`. Copy the structure of an existing page
  (`text-field.astro`/`scroll-area.astro` are good recent examples)
  rather than inventing a new layout.

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
  not decoration (it's also what gets scraped into the docs site and the
  llms.txt files, so it's read by both humans and agents later).
- Icons are hand-authored inline `<svg>` with `stroke="currentColor"`
  (see `Toast.tsx`'s close icon or `Checkbox.tsx`'s checkmark) — no icon
  library dependency in either package.

## Known gotchas (hit these once already; don't re-hit them)

- **The docs site consumes `dist/`, not `src/`.** After changing
  `packages/react` or `packages/elements`, run `bun run build` in that
  package *before* checking the docs site in a browser — the Astro dev
  server resolves `@kernelui/react`/`@kernelui/elements` through their
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
- Actually open the docs page in a browser and interact with it — typecheck
  passing proves the types line up, not that the feature works.
