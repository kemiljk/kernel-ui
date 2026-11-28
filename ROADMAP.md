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
| Run `test:shape` in CI | in review | [#111](https://github.com/kemiljk/kernel-ui/pull/111) | AGENTS.md required it, CI never ran it |
| Parity check: registry ↔ React exports ↔ custom elements | in review | [#111](https://github.com/kemiljk/kernel-ui/pull/111) | `scripts/check-parity.mjs` |
| DOM parity tests: render React and elements, compare classes and ARIA | next | | `@kernelui-lib/elements` has no tests today |
| Contrast check in CI: APCA Lc + WCAG 2 floor, every preset, light and dark | in review | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | `test:contrast`; APCA is Kernel's standard |
| Screenshot suite: light, dark, Round, Sharp, RTL, low-sitting font | next | | Grow from the harness used for #109/#110 |
| axe accessibility checks in CI | blocked | | Needs a new dev dependency; awaiting approval |
| Bundle-size budget per package | later | | |

## 2. Optical design system

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Optical pills: Badge, TagInput tags, Suggestion | in review | [#109](https://github.com/kemiljk/kernel-ui/pull/109) | |
| Optical Button and `<kernel-button>` icon slots | in review | [#110](https://github.com/kemiljk/kernel-ui/pull/110) | Stacked on #109 |
| Icon tokens: `--kernel-icon-size`, `--kernel-icon-stroke-width` | in review | #109 | |
| Docs page that swaps icon packages | in review | [#112](https://github.com/kemiljk/kernel-ui/pull/112) | Lucide, Phosphor, Heroicons, Tabler, Radix, each tuned by measurement |
| Roll the recipe out to Toggle, Tabs, Select, TextField at Round, citation chips | next | | |
| Cap-height centring for inputs and Tabs | next | | |
| Full design audit of all components | done | | 60 components × light/dark/Round/Sharp, RTL, 390px. Findings below |
| Fix: pill icon detection treated component children as icons | in review | [#109](https://github.com/kemiljk/kernel-ui/pull/109) | Audit P0; hid translated/Astro labels. Fixed with DOM detection |
| UI polish references from Mobbin | next | | Mobbin MCP installed and signed in; needs a fresh session to load |

## 2a. Design audit findings

From the full audit. P0 = broken or inaccessible, P1 = visibly unpolished, P2 = refinement.

| Item | Priority | Status | PR | Notes |
| --- | --- | --- | --- | --- |
| Focus ring fails 3:1 contrast in light mode | P0 | in review | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | `--kernel-color-focus-ring` is accent-9 (2.06:1) |
| Unchecked control borders too faint | P0 | in review | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | gray-7 is 1.75:1 light, 2.36:1 dark |
| Switch thumb breaks in RTL | P0 | in review | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | Physical translate on a logical inset |
| Checkbox becomes a circle at Round | P0 | in review | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | Cap small-control radii by size |
| NumberField steppers cramped at Round; sub-24px targets | P1 | next | | |
| Tabs, InputOTP and Pagination overflow or wrap at 390px | P1 | next | | |
| Slider fill and directional icons don't mirror in RTL | P1 | next | | Shared `--dir` and icon-flip utility |
| TagInput remove hover invisible in dark mode | P1 | next | | Hover-overlay token instead of black alpha |
| Small hit areas: Carousel dots, citations, sort buttons, Resizable divider | P1 | next | | Hit-area utility |
| Citation chips: overflow, line-height jump, comma gap | P1 | next | | Optical pill |
| AgentActivity chevrons placed two ways | P1 | next | | |
| Optical pill for fields at Round, Toggle, NavigationMenu, Pagination | P2 | next | | Make the recipe a shared utility first |
| Off-grid control heights (Suggestion 40.6px, NavigationMenu, CodeBlock copy) | P2 | next | | |
| Focus offset token; motion loop tokens; shared keyframes | P2 | later | | |
| Toast muted text on tints; danger hover mixes with black | P2 | later | | |
| Resizable radius and grip; Slider track token; Label demo inputs | P2 | later | | |
| CI checks: physical translate/`to right` without RTL pair, black-alpha hovers, literal durations | P2 | later | | Next to `test:shape` |

## 3. Agent-native

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Skills shipped in the packages (build, migrate, theme, elements) | in review | [#115](https://github.com/kemiljk/kernel-ui/pull/115) | Agent Skills format, `tanstack-intent` keyword |
| `kernel agents`: install skills, register MCP, add AGENTS.md/CLAUDE.md section | in review | [#115](https://github.com/kemiljk/kernel-ui/pull/115) | |
| Claude Code plugin with the same skills | later | | |
| Generated prop schemas in the registry (`api.json`) | in review | [#113](https://github.com/kemiljk/kernel-ui/pull/113) | 477 React props, 256 element attributes, from source |
| `kernel mcp` server: search, docs, props, tokens, conventions, check | in review | [#114](https://github.com/kemiljk/kernel-ui/pull/114) | Dependency-free stdio; `kernel mcp init --client` |
| Lint pack for agent output | in progress | [#114](https://github.com/kemiljk/kernel-ui/pull/114) | `kernel check` / `check_code` shipped; ESLint plugin later |
| Generate docs props tables from `api.json` | next | | Replaces hand-written tables |
| Make `registry.json` a valid shadcn registry | later | | `npx shadcn add` and the shadcn MCP for free |
| Agent discovery: decision-focused llms.txt, Choosing Kernel and AI agents guides, markdown alternates, JSON-LD | in review | [#117](https://github.com/kemiljk/kernel-ui/pull/117) | Honest fit guidance; no hidden instructions |
| Skills discovery at /.well-known/agent-skills | in review | [#117](https://github.com/kemiljk/kernel-ui/pull/117) | Best-effort format; verify with `npx skills add https://www.kernelui.com` once live |
| Publish to the official MCP Registry | blocked | | Needs Karl: after the next CLI release, `mcp-publisher login github` + `publish` |
| List in skills and MCP directories (skills.sh, Smithery, Glama, PulseMCP) | later | | Needs Karl's accounts |
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
| Decide: move field borders to the 3:1 control border | next | | Needs Karl's call; bigger visual change |
| Browser support matrix and semver/deprecation policy in docs | later | | |
