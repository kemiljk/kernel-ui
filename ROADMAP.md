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
| Run `test:shape` in CI | done | [#111](https://github.com/kemiljk/kernel-ui/pull/111) | AGENTS.md required it, CI never ran it |
| Parity check: registry ↔ React exports ↔ custom elements | done | [#111](https://github.com/kemiljk/kernel-ui/pull/111) | `scripts/check-parity.mjs` |
| DOM parity tests: render React and elements, compare classes and ARIA | done | | `@kernelui-lib/elements` has no tests today |
| Contrast check in CI: APCA Lc + WCAG 2 floor, every preset, light and dark | done | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | `test:contrast`; APCA is Kernel's standard |
| Screenshot suite: light, dark, Round, Sharp, RTL, low-sitting font | done | [#138](https://github.com/kemiljk/kernel-ui/pull/138) | `test:screenshots`, 720 shots; a separate Screenshots workflow keeps a Linux baseline from main |
| axe accessibility checks in CI | done | | `test:a11y`: 69 components × light/dark, no serious/critical violations |
| Bundle-size budget per package | done | [#132](https://github.com/kemiljk/kernel-ui/pull/132) | `test:size`, gzip + brotli per entry; raised for batch 2 in [#154](https://github.com/kemiljk/kernel-ui/pull/154) |

## 2. Optical design system

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Optical pills: Badge, TagInput tags, Suggestion | done | [#109](https://github.com/kemiljk/kernel-ui/pull/109) | |
| Optical Button and `<kernel-button>` icon slots | done | [#110](https://github.com/kemiljk/kernel-ui/pull/110) | Stacked on #109 |
| Icon tokens: `--kernel-icon-size`, `--kernel-icon-stroke-width` | done | #109 | |
| Docs page that swaps icon packages | done | [#112](https://github.com/kemiljk/kernel-ui/pull/112) | Lucide, Phosphor, Heroicons, Tabler, Radix, each tuned by measurement |
| Roll the recipe out to Toggle, Tabs, Select, TextField at Round, citation chips | done | | |
| Cap-height centring for inputs and Tabs | won't do | | Inputs draw text in the browser's inner editor (no pseudo-elements, no text-box-trim); measured within 0.5px already |
| Full design audit of all components | done | | 60 components × light/dark/Round/Sharp, RTL, 390px. Findings below |
| Fix: pill icon detection treated component children as icons | done | [#109](https://github.com/kemiljk/kernel-ui/pull/109) | Audit P0; hid translated/Astro labels. Fixed with DOM detection |
| UI polish references from Mobbin | done | [#135](https://github.com/kemiljk/kernel-ui/pull/135) | Ten components: menus, Select, Dialog, EmptyState, date pickers, Pagination, Tooltip, Callout, Breadcrumbs |

## 2a. Design audit findings

From the full audit. P0 = broken or inaccessible, P1 = visibly unpolished, P2 = refinement.

| Item | Priority | Status | PR | Notes |
| --- | --- | --- | --- | --- |
| Focus ring fails 3:1 contrast in light mode | P0 | done | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | `--kernel-color-focus-ring` is accent-9 (2.06:1) |
| Unchecked control borders too faint | P0 | done | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | gray-7 is 1.75:1 light, 2.36:1 dark |
| Switch thumb breaks in RTL | P0 | done | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | Physical translate on a logical inset |
| Checkbox becomes a circle at Round | P0 | done | [#116](https://github.com/kemiljk/kernel-ui/pull/116) | Cap small-control radii by size |
| NumberField steppers cramped at Round; sub-24px targets | P1 | done | | |
| Tabs, InputOTP and Pagination overflow or wrap at 390px | P1 | done | | |
| Slider fill and directional icons don't mirror in RTL | P1 | done | | Shared `--dir` and icon-flip utility |
| TagInput remove hover invisible in dark mode | P1 | done | | Hover-overlay token instead of black alpha |
| Small hit areas: Carousel dots, citations, sort buttons, Resizable divider | P1 | done | | Hit-area utility |
| Citation chips: overflow, line-height jump, comma gap | P1 | done | | Optical pill |
| AgentActivity chevrons placed two ways | P1 | done | | |
| Optical pill for fields at Round, Toggle, NavigationMenu, Pagination | P2 | done | | Make the recipe a shared utility first |
| Off-grid control heights (Suggestion 40.6px, NavigationMenu, CodeBlock copy) | P2 | done | | |
| Focus offset token; motion loop tokens; shared keyframes | done | | Offsets and loop tokens done; shake keyframes still per component |
| Toast muted text on tints; danger hover mixes with black | P2 | done | | |
| Resizable radius and grip; Slider track token; Label demo inputs | P2 | done | | |
| CI checks: physical translate/`to right` without RTL pair, black-alpha hovers, literal durations | P2 | done | [#132](https://github.com/kemiljk/kernel-ui/pull/132) | `test:css`; found and fixed RTL bugs in Dialog, Sheet and Table |

## 2b. Motion

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Motion audit of every component (animate, better-motion and related skills) | done | | |
| Reduced motion that works: per-component gentle variants, essential loops slow instead of freeze | done | | The reset used to override every component |
| Motion tokens: large-surface scale, recede, drawer curve, loops | done | | |
| Tooltip warm-up group; Dialog/Sheet/Toast/ContextMenu/Select/disclosure polish | done | | |
| Tabs indicator morph; press feedback everywhere | done | | |
| Element-scoped view transitions for TodoList reorder and shared morphs | done | [#134](https://github.com/kemiljk/kernel-ui/pull/134) | FLIP fallback where unsupported |
| Toast swipe on velocity; Sheet velocity dismiss | done | [#134](https://github.com/kemiljk/kernel-ui/pull/134) | Shared gesture maths; `snapTo` fixed on every side |

## 3. Agent-native

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Skills shipped in the packages (build, migrate, theme, elements) | done | [#115](https://github.com/kemiljk/kernel-ui/pull/115) | Agent Skills format, `tanstack-intent` keyword |
| `kernel agents`: install skills, register MCP, add AGENTS.md/CLAUDE.md section | done | [#115](https://github.com/kemiljk/kernel-ui/pull/115) | |
| Claude Code plugin with the same skills | done | [#133](https://github.com/kemiljk/kernel-ui/pull/133) | `/plugin marketplace add kemiljk/kernel-ui`; `test:plugin` keeps the copy in sync |
| Generated prop schemas in the registry (`api.json`) | done | [#113](https://github.com/kemiljk/kernel-ui/pull/113) | 477 React props, 256 element attributes, from source |
| `kernel mcp` server: search, docs, props, tokens, conventions, check | done | [#114](https://github.com/kemiljk/kernel-ui/pull/114) | Dependency-free stdio; `kernel mcp init --client` |
| Lint pack for agent output | done | [#114](https://github.com/kemiljk/kernel-ui/pull/114) | `kernel check` / `check_code` shipped; ESLint plugin later |
| Generate docs props tables from `api.json` | done | | Replaces hand-written tables |
| Make `registry.json` a valid shadcn registry | done | [#133](https://github.com/kemiljk/kernel-ui/pull/133) | `/r/<name>.json`, validated against shadcn's schemas in `test:shadcn` |
| Agent discovery: decision-focused llms.txt, Choosing Kernel and AI agents guides, markdown alternates, JSON-LD | done | [#117](https://github.com/kemiljk/kernel-ui/pull/117) | Honest fit guidance; no hidden instructions |
| Skills discovery at /.well-known/agent-skills | done | [#117](https://github.com/kemiljk/kernel-ui/pull/117) | Best-effort format; verify with `npx skills add https://www.kernelui.com` once live |
| Publish to the official MCP Registry | done | [#129](https://github.com/kemiljk/kernel-ui/pull/129) | `io.github.kemiljk/kernel-ui` 1.1.0 published by hand on 28 Nov 2026; #129 publishes from the release job via GitHub OIDC |
| List in skills and MCP directories (skills.sh, Smithery, Glama, PulseMCP) | in progress | | `npx skills add https://www.kernelui.com` works. Glama and PulseMCP pick it up from the MCP Registry; Smithery needs Karl to submit while signed in; skills.sh lists by install count |
| Agent bridge: in-page snapshot/act, WebMCP tools | done | [#142](https://github.com/kemiljk/kernel-ui/pull/142) | `@kernelui-lib/agent`; scoped, redacting, confirmation through ToolApproval |
| Testing kit: WAI-ARIA pattern checks for composed UIs | done | [#145](https://github.com/kemiljk/kernel-ui/pull/145) | `@kernelui-lib/testing`; found and fixed Tooltip, HoverCard, date picker, ContextMenu and field bugs |
| Cancellable change reasons; fuzzy filtering; grid navigation | done | [#143](https://github.com/kemiljk/kernel-ui/pull/143) | `beforevaluechange` → `valuechange`/`change` in elements |
| Agent eval suite: fixed prompts scored by lint, axe and screenshots | done | [#136](https://github.com/kemiljk/kernel-ui/pull/136) | 10 tasks; baseline Claude 96.7, Codex 100; fixes from its findings in [#150](https://github.com/kemiljk/kernel-ui/pull/150)–[#153](https://github.com/kemiljk/kernel-ui/pull/153) |

## 4. Agent UI components

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| Streaming markdown text | done | [#139](https://github.com/kemiljk/kernel-ui/pull/139) | Dependency-free, XSS-safe, stable blocks while streaming |
| Tool-call approval prompt | done | | |
| Attachment chips | done | | |
| Model picker | done | [#139](https://github.com/kemiljk/kernel-ui/pull/139) | |
| Usage / token meter | done | | |
| Artifact / canvas panel | done | [#140](https://github.com/kemiljk/kernel-ui/pull/140) | Docked or modal overlay |
| Kbd, EmptyState | done | | Segmented control still later |
| Schema-driven renderer (model returns JSON, Kernel renders it) | done | [#140](https://github.com/kemiljk/kernel-ui/pull/140) | Versioned allow-list of 17 node types, `parsePartialJson`, `schemaPrompt` |

## 5. Package citizenship

| Item | Status | PR | Notes |
| --- | --- | --- | --- |
| `"use client"` in the React build | done | | Rolldown `output.banner`; `test:package` checks it's the first statement |
| CSS cascade layers for tokens, reset and components | done | | Opt-in `styles.layer.css` in both packages; `styles.css` stays unlayered |
| `custom-elements.json` manifest and framework JSX types | done | | Generated from `api.json`: manifest, VS Code custom data, React 19 `jsx.d.ts` |
| Translatable built-in strings (`labels`) | done | | 7 hard-coded English strings in React |
| Density token (compact / comfortable) | done | [#137](https://github.com/kemiljk/kernel-ui/pull/137) | `data-kernel-density`, works on a subtree |
| `forced-colors` and reduced-transparency support | done | [#137](https://github.com/kemiljk/kernel-ui/pull/137) | ~25 components redraw state in system colours |
| Label contrast on solid fills (accent, danger, success, warning, badges) | done | [#148](https://github.com/kemiljk/kernel-ui/pull/148) | `test:contrast` now 208 checks |
| Cross-browser pass (Firefox, WebKit), RTL, reduced motion, touch | in progress | | After batch 2 landed in [#154](https://github.com/kemiljk/kernel-ui/pull/154) |
| New npm packages `@kernelui-lib/agent` and `@kernelui-lib/testing`: first publish | blocked | | First publish needs Karl's passkey; then trusted publishing |
| Field borders: keep `border-interactive` | decided | | Karl: leave as is |
| Browser support matrix and semver/deprecation policy in docs | done | [#133](https://github.com/kemiljk/kernel-ui/pull/133), [#141](https://github.com/kemiljk/kernel-ui/pull/141) | `/support/`; dev-only deprecation warnings |
