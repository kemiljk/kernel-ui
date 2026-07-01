# Kernel

A component library built on the actual kernel of the web: real semantic HTML elements, not div soup.

Every component starts from the native element that already does the job (`button`, `dialog`, `details`/`summary`, `fieldset`, `table`) and layers on only the behaviour and ARIA the browser doesn't give you for free. Styling is a single set of CSS custom properties, so changing one root token cascades through every component, whether you consume it via plain CSS, CSS Modules, or the optional Tailwind preset.

See [`ROADMAP.md`](./ROADMAP.md) for the architecture decisions, the full component plan, and what's built versus what's next.

## Packages

- `packages/react` — `@kernelui/react`, the component library.
- `packages/styles` — `@kernelui/styles`, the design tokens and baseline theme (CSS variables + Tailwind v4 preset).
- `apps/docs` — the documentation and playground site, built with Astro.

## Getting started

```bash
pnpm install
pnpm dev        # runs the docs site at localhost:4321
```

## Status

Early days. The core architecture and a first slice of components (Button, Text Field, Checkbox, Switch, Accordion, Dialog) are in place to prove the pattern end to end. See the roadmap for the rest of the day-1 set.
