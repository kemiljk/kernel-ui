# Kernel UI roadmap

The plan to make Kernel the go-to component library for agent-driven UI
work, and a model npm citizen. Each item links its PR once one exists.
Status is one of: **done**, **in review**, **in progress**, **next**,
**later**, **blocked** (with the reason).

Update this file in the same PR that moves an item.

## 1. Guardrails

Checks that stop regressions before review, so the rest of the roadmap can move fast.

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Run `test:shape` in CI | in review | this PR | AGENTS.md required it, CI never ran it |
| Parity check: registry ↔ React exports ↔ custom elements | in review | this PR | `scripts/check-parity.mjs` |
| DOM parity tests: render React and elements, compare classes and ARIA | next | | `@kernelui-lib/elements` has no tests today |
| Screenshot suite: light, dark, Round, Sharp, RTL, low-sitting font | next | | Grow from the harness used for #109/#110 |
| axe accessibility checks in CI | blocked | | Needs a new dev dependency; awaiting approval |
| Bundle-size budget per package | later | | |

## 2. Optical design system

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Optical pills: Badge, TagInput tags, Suggestion | in review | [#109](https://github.com/kemiljk/kernel-ui/pull/109) | |
| Optical Button and `<kernel-button>` icon slots | in review | [#110](https://github.com/kemiljk/kernel-ui/pull/110) | Stacked on #109 |
| Icon tokens: `--kernel-icon-size`, `--kernel-icon-stroke-width` | in review | #109 | |
| Docs page that swaps icon packages | blocked | | Docs-only icon dependencies need approval |
| Roll the recipe out to Toggle, Tabs, Select, TextField at Round, citation chips | next | | |
| Cap-height centring for inputs and Tabs | next | | |
| Full design audit of all components | in progress | | Findings land as items below |
| TagInput remove hover invisible in dark mode | next | | Hard-coded translucent black |
| UI polish references from Mobbin | blocked | | Mobbin MCP not connected |

## 3. Agent-native

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Skills shipped in the packages (build, migrate, theme, review) | next | | Agent Skills format |
| `kernel init --agents`: install skills, add AGENTS.md/CLAUDE.md section | next | | |
| Claude Code plugin with the same skills | later | | |
| Generated prop schemas in the registry | next | | Feeds docs tables, `llms.txt`, MCP, CLI |
| `kernel mcp` server: search, docs, props, tokens, check | later | | After prop schemas |
| Lint pack for agent output (tokens, labels, `<div onClick>`, shape pairing) | later | | |
| Agent eval suite: fixed prompts scored by lint, axe and screenshots | later | | |

## 4. Agent UI components

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Streaming markdown text | later | | |
| Tool-call approval prompt | later | | |
| Attachment chips | later | | |
| Model picker | later | | |
| Usage / token meter | later | | |
| Artifact / canvas panel | later | | |
| Kbd, EmptyState, segmented control | later | | |
| Schema-driven renderer (model returns JSON, Kernel renders it) | later | | |

## 5. Package citizenship

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| `"use client"` in the React build | next | | Server Components can't import Kernel directly today |
| CSS cascade layers for tokens, reset and components | next | | Clean override story for consumers |
| `custom-elements.json` manifest and framework JSX types | next | | |
| Translatable built-in strings (`labels`) | next | | 7 hard-coded English strings in React |
| Density token (compact / comfortable) | later | | |
| `forced-colors` and reduced-transparency support | later | | |
| Browser support matrix and semver/deprecation policy in docs | later | | |
