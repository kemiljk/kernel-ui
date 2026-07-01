# Kernel roadmap

## Why "Kernel"

A component library built on the actual kernel of the web: the native elements and behaviours browsers already ship, rather than div soup rebuilt with ARIA and JavaScript. "Kernel" also nods to the founder's initial (K) and reads naturally as "the essential core of something", which is exactly the pitch. Considered and rejected: **Popcorn** (fun pun on "kernel", but a same-named, if inactive, npm package already exists), **KoreUI** (too close to the established `@coreui/react`, real risk of confusion).

## Architecture decisions

- **Runtime**: React components. Matches the precedent of every library this project was benchmarked against (Radix, Base UI, React Aria, shadcn) and the primary stack it's built for (React, Next.js, Astro islands).
- **Distribution**: npm package first (`@kernelui/react`, `@kernelui/styles`), versioned and tree-shakeable. A shadcn-style `npx kernel add button` copy-paste registry is a natural phase two once the component set has stabilised, it doesn't change how components are authored, only how they're delivered.
- **Styling default**: styled out of the box with a clean baseline theme, fully overridable. Every visual value is a CSS custom property.
- **Composition**: an explicit `render` prop (Base UI's model), not Radix's `asChild` magic. What actually gets rendered is always visible at the call site.
- **State exposure**: interactive state is exposed as real pseudo-classes (`:checked`, `:disabled`, `:user-invalid`) wherever a native element provides them, and as `data-*`/`aria-*` attributes (mirroring React Aria/Radix) everywhere else. CSS never needs a JS-driven class toggle to know a component's state.
- **Theming**: one CSS custom property layer (`@kernelui/styles`) is the single source of truth. Plain CSS, CSS Modules, and an optional Tailwind v4 preset (`@theme inline`) all read from the same variables, so there's never a second copy of a token to keep in sync.
- **Colour system**: a 12-step scale per colour role (gray, accent, status colours), modelled on [Radix Colors' scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale): every step has exactly one job (backgrounds 1–2, component backgrounds 3–5, borders 6–8, solid 9–10, text 11–12). Unlike Radix's hand-tuned-per-hue swatches, Kernel's steps are generated from one shared lightness/chroma curve in OKLCH, which is what lets a single hue or chroma value reshade the whole system. The trade-off is documented in `packages/styles/README.md`: contrast is close but not APCA-identical across very different hues yet.

## What's built (waves 1–3)

Real semantic backbone for each:

- **Button** — `<button>`
- **Text Field** — `<label>` + `<input>`
- **Checkbox** — `<input type="checkbox">`, styled via `:checked`/`:indeterminate`
- **Switch** — `<button role="switch">` (WAI-ARIA switch pattern, no native element exists yet)
- **Accordion** — `<details>`/`<summary>`, `name` attribute for native exclusive-open
- **Dialog** — `<dialog>`, opened with `showModal()`
- **Header / Nav / Sidebar / Footer** — `<header>`, `<nav>`, `<aside>`, `<footer>` landmark primitives
- **Label** — standalone `<label>`
- **Textarea** — `<textarea>`, auto-growing via `field-sizing: content`
- **Radio Group** — `<fieldset>` + `<legend>` + `<input type="radio">`, native arrow-key roving
- **Select** — native `<select>`
- **Separator** — `<hr>` (or `role="separator"` for a non-semantic-rule visual divider)
- **Badge** — `<span>` (no more specific native element applies)
- **Avatar** — `<img>` with an initials fallback
- **Progress** — `<progress>`
- **Alert** — `role="alert"` / `role="status"` live region
- **Tabs** — WAI-ARIA `tablist`/`tab`/`tabpanel` pattern (no native element exists yet)
- **Table** — `<table>`, `<caption>`, `<thead>`, `<th scope>`
- **Toggle** — `<button aria-pressed>`
- **Card** — `<div>` by default, `as="article"` when content is genuinely self-contained (the one component without a single strong native anchor)
- **Skeleton** — `<div aria-hidden="true">`
- **Breadcrumbs** — `<nav aria-label="Breadcrumb">` + `<ol>`
- **Pagination** — `<nav aria-label="Pagination">` + `<ol>`
- **Slider** — `<input type="range">`, fill percentage handed to CSS via a custom property
- **Tooltip** — Popover API (`popover="manual"`) + CSS anchor positioning, `interestfor` declared as a forward-looking enhancement
- **Popover** — `popover="auto"` + `popoverTarget`, native light-dismiss, CSS anchor positioning
- **Dropdown Menu** — `popover="auto"` + `role="menu"`, hand-wired arrow-key roving (no native menu element exists)
- **Combobox** — WAI-ARIA 1.2 combobox pattern, `role="combobox"` + `aria-activedescendant` + `popover="manual"` listbox
- **Toast** — a shared, queued `role="status"`/`role="alert"` live region, imperative `toast()` API via `useSyncExternalStore`

CSS anchor positioning (Tooltip/Popover/Dropdown Menu/Combobox's shared `useFloatingPosition` hook) is Baseline as of 2026 (Chrome/Edge 125+, Firefox 147+, Safari 26+, roughly 83–91% global support). Where it isn't available, a `getBoundingClientRect`-based fallback keeps position in sync on scroll and resize; this is the one part of the floating-content components that's genuinely JavaScript rather than a native mechanism.

## Planned (wave 4+)

The remaining, more involved pieces, each with the semantic approach it'll take:

| Component | Semantic approach |
| --- | --- |
| Command Palette | `<dialog>` + a filtered `<input>` + `role="listbox"` |
| Navigation Menu | `<nav>` with nested disclosure, mega-menu via `popover` |
| Context Menu | `role="menu"` positioned at the contextmenu event's coordinates, same primitives as Dropdown Menu |
| Hover Card | `popover=hint` / `interestfor`, a heavier Tooltip |
| Data Table | `<table>` plus sort/filter/paginate behaviour layered on top |
| Date Picker / Calendar | `<table>` grid with real `<button>` day cells, `aria-selected` |
| Input OTP | a row of real `<input>` elements with roving focus |
| Carousel | `scroll-snap-type` + `scroll-snap-align`, native scrolling instead of a JS carousel engine |
| Resizable | pure CSS `resize` where possible, pointer-event-driven only for pane-to-pane splits |
| Scroll Area | native scrolling + `scrollbar-gutter: stable`, custom scrollbar styling as enhancement only |
| Menubar | `role="menubar"` composed from the same primitives as Dropdown Menu |
| Aspect Ratio | pure CSS (`aspect-ratio`), arguably doesn't need a component at all |

## Fixed post-wave-3

Issues found running the real build rather than just reading the source, worth recording so they don't quietly reappear:

- **Docs site never loaded component CSS.** `apps/docs/src/styles/global.css` imported `@kernelui/styles` (tokens + reset) but never `@kernelui/react/styles.css` (the compiled `.kernel-*` class rules), so every component rendered with zero component-specific styling, layout, colour, or spacing, just raw browser defaults. This was the entire cause of the site looking broken; the component CSS itself was fine. Fixed by adding the missing `@import`.
- **`bun dev` failed with "concurrently: command not found".** Editing `package.json` to add `concurrently` as a devDependency (to fix the earlier "package could not be resolved" bug) does nothing until `bun install` runs again, and there's no way to guarantee that happens before someone runs `bun dev`. Replaced the dependency entirely with `scripts/dev.mjs`, a ~60-line script using only `node:child_process`, already in the runtime either way, so there's nothing left to install or forget to install.
- **~30-link sidebar stacked above page content below 900px.** The `.docs-shell` grid correctly collapses to one column on narrow viewports, but naively stacking a full component-index nav above the actual page pushed whatever the visitor came to read off the first screen. Fixed with `MobileNav.tsx`: the sidebar is hidden below 900px and replaced by a trigger that opens the same links in a `Dialog`, the pattern shadcn/ui, Base UI, and Radix's own docs sites all use instead of stacking.
- **Green and Teal accent presets had barely-legible button text.** See "Colour theming" below, both now bake in a measured, not assumed, foreground colour.
- **"Violet" wasn't violet.** The original demo hue (258) is blue by any OKLCH-based reference check. See "Colour theming" below.

## Colour theming: live hue vs. named presets

Two systems now cover the two things people actually want from theming:

- **`--kernel-hue-accent`** (live, any value, `packages/styles/src/tokens.css`): one shared lightness/chroma curve applied via `calc()` in OKLCH, same as always. It has to stay a flat curve because it's a runtime CSS variable, there's no way to gamut-check a hue nobody's typed in yet.
- **Named theme presets** (fixed set, `packages/styles/src/themes/`): `blue`, `green`, `red`, `violet`, `orange`, `teal`. Generated by `packages/styles/scripts/generate-accent-themes.mjs`, which uses `culori` to binary-search the maximum in-gamut sRGB chroma for every one of the 12 steps, individually, at that preset's exact hue. This is the per-hue calibration this section used to describe as a future refinement, it's implemented, just scoped to a curated set of hues rather than the fully dynamic slider, for the reason above. Opt in with `data-kernel-accent="name"` after importing `@kernelui/styles/themes/<name>.css` (or `themes/index.css` for all of them, e.g. for a theme switcher, see the docs homepage).

Naming note: the original "Violet" demo preset used hue 258, which is blue (verified by converting reference swatches to OKLCH, not by eye). All six preset hues above, and the default `--kernel-hue-accent: 258`'s description in `tokens.css`, have been checked the same way.

Foreground note: `--kernel-color-on-accent` falls back to a flat white in `tokens.css` when `contrast-color()` isn't supported, which is fine for most hues but measured as under WCAG AA (4.5:1) against green and teal's step 9 specifically, at the fixed lightness the shared curve uses for every hue. Each generated theme now measures both black and white against its own step 9 and bakes in whichever wins as its own `--kernel-color-on-accent` override, so this doesn't depend on `contrast-color()` support at all for the six named presets. The live `--kernel-hue-accent` slider still uses the flat white fallback, same caveat as the chroma curve above.

Still a real trade-off, not fully closed: Radix additionally targets specific APCA contrast ratios per step, which this script doesn't do (it optimises for "as vivid as sRGB allows", not "hits contrast ratio X against gray-1"). Close enough for the current component set; worth revisiting if a component needs a guaranteed contrast ratio a generated step doesn't happen to hit.
