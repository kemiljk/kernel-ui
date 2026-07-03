# Kernel

A component library built on the actual kernel of the web: real semantic HTML elements, not div soup.

Every component starts from the native element that already does the job (`button`, `dialog`, `details`/`summary`, `fieldset`, `table`) and layers on only the behaviour and ARIA the browser doesn't give you for free. Styling is a single set of CSS custom properties, so changing one root token cascades through every component, whether you consume it via plain CSS, CSS Modules, or the optional Tailwind preset.

See [`ROADMAP.md`](./ROADMAP.md) for the architecture decisions, the full component plan, and what's built versus what's next.

## Packages

- `packages/react` — `@kernelui/react`, the component library, for React.
- `packages/elements` — `@kernelui/elements`, the same design as framework-free Custom Elements (Vue, Svelte, Astro, plain HTML).
- `packages/styles` — `@kernelui/styles`, the design tokens and baseline theme (CSS variables + Tailwind v4 preset).
- `apps/docs` — the documentation and playground site, built with Astro.

Both `@kernelui/react` and `@kernelui/elements` ship an `llms.txt` in
their own package root — a self-contained cheat sheet for an LLM/agent
working in a project that installed one of them, covering the shared
prop/attribute conventions and every component with a one-line
description. The docs site also serves `/llms.txt` (an index) and
`/llms-full.txt` (every page concatenated), plus a `.md` mirror of every
individual page (`/components/<slug>.md`), generated from the same
build that produces the human-facing HTML.

## Getting started

```bash
bun install
bun run dev     # runs the docs site at localhost:4321
```

## Status

The core architecture is in place and proven out across 40+ components spanning primitives, forms, layout, feedback, overlays, navigation, data display, and AI-specific components (Reasoning, Composer, ThinkingIndicator). See the roadmap for what's built versus what's next.
