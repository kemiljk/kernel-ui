# Kernel roadmap

## Why "Kernel"

A component library built on the actual kernel of the web: the native elements and behaviours browsers already ship, rather than div soup rebuilt with ARIA and JavaScript. "Kernel" also nods to the founder's initial (K) and reads naturally as "the essential core of something", which is exactly the pitch. Considered and rejected: **Popcorn** (fun pun on "kernel", but a same-named, if inactive, npm package already exists), **KoreUI** (too close to the established `@coreui/react`, real risk of confusion).

## Architecture decisions

- **Runtime**: React components. Matches the precedent of every library this project was benchmarked against (Radix, Base UI, React Aria, shadcn) and the primary stack it's built for (React, Next.js, Astro islands).
- **Distribution**: npm package first (`@kernelui-lib/react`, `@kernelui-lib/styles`), versioned and tree-shakeable. A shadcn-style `npx kernel add button` copy-paste registry is a natural phase two once the component set has stabilised, it doesn't change how components are authored, only how they're delivered.
- **Styling default**: styled out of the box with a clean baseline theme, fully overridable. Every visual value is a CSS custom property.
- **Composition**: an explicit `render` prop (Base UI's model), not Radix's `asChild` magic. What actually gets rendered is always visible at the call site.
- **State exposure**: interactive state is exposed as real pseudo-classes (`:checked`, `:disabled`, `:user-invalid`) wherever a native element provides them, and as `data-*`/`aria-*` attributes (mirroring React Aria/Radix) everywhere else. CSS never needs a JS-driven class toggle to know a component's state.
- **Theming**: one CSS custom property layer (`@kernelui-lib/styles`) is the single source of truth. Plain CSS, CSS Modules, and an optional Tailwind v4 preset (`@theme inline`) all read from the same variables, so there's never a second copy of a token to keep in sync.
- **Colour system**: a 12-step scale per colour role (gray, accent, status colours), modelled on [Radix Colors' scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale): every step has exactly one job (backgrounds 1–2, component backgrounds 3–5, borders 6–8, solid 9–10, text 11–12). Unlike Radix's hand-tuned-per-hue swatches, Kernel's steps are generated from one shared lightness/chroma curve in OKLCH, which is what lets a single hue or chroma value reshade the whole system. The trade-off is documented in `packages/styles/README.md`: contrast is close but not APCA-identical across very different hues yet.

## What's built

51 components are documented and available in both `@kernelui-lib/react` and `@kernelui-lib/elements`. See the [components index](https://www.kernelui.com/components/) for the full catalog with live demos, props tables, and accessibility notes.

Every component starts from the native element or WAI-ARIA pattern that already does the job (`button`, `dialog`, `details`/`summary`, `fieldset`, `table`, and so on) and layers on only the behaviour the browser doesn't give you for free.

## Planned (wave 4+)

The remaining, more involved pieces and post-v1 distribution work:

| Item | Notes |
| --- | --- |
| shadcn-style registry | `npx kernel add button` copy-paste delivery once the component set stabilises |
| Context Menu | `role="menu"` positioned at contextmenu coordinates |
| Menubar | `role="menubar"` composed from dropdown-menu primitives |
| Aspect Ratio helper | Pure CSS (`aspect-ratio`), may stay a token utility rather than a component |

## Fixed post-wave-3

Issues found running the real build rather than just reading the source, worth recording so they don't quietly reappear:

- **Docs site never loaded component CSS.** `apps/docs/src/styles/global.css` imported `@kernelui-lib/styles` (tokens + reset) but never `@kernelui-lib/react/styles.css` (the compiled `.kernel-*` class rules), so every component rendered with zero component-specific styling, layout, colour, or spacing, just raw browser defaults. This was the entire cause of the site looking broken; the component CSS itself was fine. Fixed by adding the missing `@import`.
- **`bun dev` failed with "concurrently: command not found".** Editing `package.json` to add `concurrently` as a devDependency (to fix the earlier "package could not be resolved" bug) does nothing until `bun install` runs again, and there's no way to guarantee that happens before someone runs `bun dev`. Replaced the dependency entirely with `scripts/dev.mjs`, a ~60-line script using only `node:child_process`, already in the runtime either way, so there's nothing left to install or forget to install.
- **~30-link sidebar stacked above page content below 900px.** The `.docs-shell` grid correctly collapses to one column on narrow viewports, but naively stacking a full component-index nav above the actual page pushed whatever the visitor came to read off the first screen. Fixed with `MobileNav.tsx`: the sidebar is hidden below 900px and replaced by a trigger that opens the same links in a `Dialog`, the pattern shadcn/ui, Base UI, and Radix's own docs sites all use instead of stacking.
- **Green and Teal accent presets had barely-legible button text.** See "Colour theming" below, both now bake in a measured, not assumed, foreground colour.
- **"Violet" wasn't violet.** The original demo hue (258) is blue by any OKLCH-based reference check. See "Colour theming" below.

## Colour theming: live hue vs. named presets

Two systems now cover the two things people actually want from theming:

- **`--kernel-hue-accent`** (live, any value, `packages/styles/src/tokens.css`): one shared lightness/chroma curve applied via `calc()` in OKLCH, same as always. It has to stay a flat curve because it's a runtime CSS variable, there's no way to gamut-check a hue nobody's typed in yet.
- **Named theme presets** (fixed set, `packages/styles/src/themes/`): `amber`, `blue`, `green`, `red`, `violet`, `orange`, `teal`. Generated by `packages/styles/scripts/generate-accent-themes.mjs`, which uses `culori` to binary-search the maximum in-gamut sRGB chroma for every one of the 12 steps, individually, at that preset's exact hue. This is the per-hue calibration this section used to describe as a future refinement, it's implemented, just scoped to a curated set of hues rather than the fully dynamic slider, for the reason above. Opt in with `data-kernel-accent="name"` after importing `@kernelui-lib/styles/themes/<name>.css` (or `themes/index.css` for all of them, e.g. for a theme switcher, see the docs homepage).

Naming note: the original "Violet" demo preset used hue 258, which is blue (verified by converting reference swatches to OKLCH, not by eye). All six preset hues above, and the default `--kernel-hue-accent: 258`'s description in `tokens.css`, have been checked the same way.

Foreground note: `--kernel-color-on-accent` falls back to a flat white in `tokens.css` when `contrast-color()` isn't supported, which is fine for most hues but measured as under WCAG AA (4.5:1) against green and teal's step 9 specifically, at the fixed lightness the shared curve uses for every hue. Each generated theme now measures both black and white against its own step 9 and bakes in whichever wins as its own `--kernel-color-on-accent` override, so this doesn't depend on `contrast-color()` support at all for the six named presets. The live `--kernel-hue-accent` slider still uses the flat white fallback, same caveat as the chroma curve above.

Still a real trade-off, not fully closed: Radix additionally targets specific APCA contrast ratios per step, which this script doesn't do (it optimises for "as vivid as sRGB allows", not "hits contrast ratio X against gray-1"). Close enough for the current component set; worth revisiting if a component needs a guaranteed contrast ratio a generated step doesn't happen to hit.
