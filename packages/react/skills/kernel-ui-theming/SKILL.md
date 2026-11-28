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
- **Check contrast.** After changing the accent hue, check `--kernel-color-on-accent` text contrast. It uses `contrast-color()` where supported.

To list every token with its value and purpose, use the MCP `get_tokens` tool, or read `node_modules/@kernelui-lib/styles/src/tokens.css`.
