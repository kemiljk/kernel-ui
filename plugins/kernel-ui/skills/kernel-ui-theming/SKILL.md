---
name: kernel-ui-theming
description: Theme a Kernel UI app (accent colour, radius, spacing, fonts, dark mode, icon sets) through @kernelui-lib/styles tokens. Use when asked to restyle, rebrand, change roundness or colours, or match a design.
---

# Theming Kernel

Every visual decision is a CSS custom property in `@kernelui-lib/styles`. There's no theme provider and no config file. Override tokens on `:root`, or on any container for a scoped theme.

## The few tokens that move everything

```css
:root {
  --kernel-hue-accent: 260;      /* every accent shade re-hues */
  --kernel-radius-base: 0.5rem;  /* every corner re-rounds */
  --kernel-space-unit: 0.25rem;  /* every gap and padding rescales */
  --kernel-font-sans: "Your Font", system-ui, sans-serif;
}
```

- **Accent presets.** `<html data-kernel-accent="violet">` picks one, or import `@kernelui-lib/styles/themes/<name>.css`. Names: amber, blue, green, orange, red, teal, violet.
- **Pill controls (the "Round" look).** Set `--kernel-radius-control: var(--kernel-radius-full)`. Badges, buttons and suggestions cap their radius at a true half-height pill, so their padding stays optically correct. Don't hand-set `999px` on individual components.
- **Density.** `data-kernel-density="compact"` on `<html>` or on any element tightens everything inside it: a 3px space unit instead of 4px, so gaps, padding and control heights drop by a quarter while font sizes stay put. `"comfortable"` is the default and restores it inside a compact scope. Use the attribute, not `--kernel-space-unit` alone on a subtree: derived tokens (`--kernel-space-*`, control heights, container padding and radii) resolve where they're declared, and the attribute is what re-declares them. For a custom unit on a subtree, add the attribute with any value: `<section data-kernel-density="custom" style="--kernel-space-unit: 0.3rem">`. If you pin a derived token such as `--kernel-radius-container`, pin it on `:root, [data-kernel-density]`.
- **Dark mode.** It follows `prefers-color-scheme` by default. Force it with `<html data-theme="dark">` or `data-theme="light"`. Colours use `light-dark()`, so only override the semantic tokens (`--kernel-color-*`), never per-mode copies.
- **Icon sets.** Set `--kernel-icon-size` and, for outline sets, `--kernel-icon-stroke-width` once, to match your icon library to Kernel's type. Tuned values:

  | Set | Size | Stroke width |
  | --- | --- | --- |
  | Lucide | 1.15em | 1.75 |
  | Heroicons | 1.2em | 1.5 |
  | Tabler | 1.2em | 1.6 |
  | Phosphor | 1.2em | none (filled) |
  | Radix Icons | 1.25em | none (filled) |

## Rules

- **Use the semantic tokens.** Components read the role tokens (`--kernel-color-accent`, `-surface`, `-border`, `-text-muted`, `--kernel-radius-control`, `-container`, `-sheet`), not the raw scales. Override a role token to change its meaning everywhere.
- **Round radius and padding together.** `--kernel-radius-container` and `--kernel-radius-sheet` are derived from padding, so they grow together. If you build a surface, pair `--kernel-radius-container` with `--kernel-padding-container-curve`.
- **Keep themes to tokens.** Don't restyle components with selectors on their class names. Those names are stable, but a token override survives upgrades and keeps React and Web Components identical.
- **Check contrast with APCA, not just WCAG 2.** Kernel measures contrast with APCA, the perceptual method proposed for WCAG 3, and keeps the WCAG 2 ratio as a floor. Its targets on the canvas and surface:
  - text: Lc 75 and 4.5:1;
  - muted text: Lc 60 and 4.5:1;
  - focus ring and control borders: Lc 45 and 3:1.

  When you override a colour token, check it in both light and dark mode against those levels (e.g. apcacontrast.com). Dark mode is where WCAG 2 overrates contrast most. `--kernel-color-on-accent` uses `contrast-color()` where supported. In a Kernel checkout, `bun run test:contrast` checks every preset.

- **Accessibility preferences are built in.** Under `forced-colors: active` (Windows High Contrast) components redraw state in system colours (`Highlight`, `HighlightText`, `CanvasText`); under `prefers-reduced-transparency: reduce` glass and blurred scrims turn solid through `--kernel-opacity-glass`, `--kernel-opacity-frost`, `--kernel-blur-backdrop` and `--kernel-color-scrim`. A custom translucent surface should mix with those tokens (`color-mix(in oklch, var(--kernel-color-surface) var(--kernel-opacity-glass), transparent)`) so it follows the setting too.

To list every token with its value and purpose, use the MCP `get_tokens` tool, or read `node_modules/@kernelui-lib/styles/src/tokens.css`.
