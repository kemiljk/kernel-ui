# 005 — Morph ToolCall status in place

- **Commit:** 4292c7f
- **Severity:** LOW
- **Category:** Missed opportunities
- **Estimated scope:** 6 files, ~180 lines

## Problem

ToolCall replaces the running dots/shimmer subtree with a newly mounted settled icon/text subtree. Running → complete/error therefore reads as unrelated content replacing the status rather than one tool invocation settling; this is the highest-confidence additive motion opportunity.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `packages/react/src/components/ToolCall/ToolCall.tsx` | 28–84, 113–136 | Conditional status tree |
| `packages/react/src/components/ToolCall/ToolCall.module.css` | 38–127, 153–171 | Running loops and static settled icon |
| `packages/elements/src/components/ToolCall/ToolCall.ts` | 28–69, 160–207 | Status helpers and `replaceChildren()` rebuild |
| `packages/elements/src/components/ToolCall/ToolCall.css` | matching status rules | Matching Elements styling |
| `packages/react/src/components/CodeBlock/CodeBlock.module.css` | 80–116 | House exemplar: stacked icon/text layers |
| `packages/react/src/components/TodoList/TodoList.module.css` | 105–136 | House exemplar: persistent status layers |

### Current code

```tsx
function StatusLabel({ status, label }: { status: ToolCallStatus; label: ReactNode }) {
  if (status === "running") {
    return <span className={styles.label}>…dots and shimmer…</span>;
  }
  return <span className={styles.label}><StatusIcon status={status} />…</span>;
}
```

```ts
summaryContent.replaceChildren();
if (status === "running") {
  // build dots + shimmer
  return;
}
// build a fresh icon + static text
```

## Target

Keep all visual states mounted in one fixed status slot and one stacked text slot. Toggle visibility from the existing root `data-status`; use transitions.dev's icon-swap structure, expressed with Kernel's established class names and tokens.

```css
.statusSlot,
.labelStack {
  display: inline-grid;
}

.statusLayer,
.labelLayer {
  grid-area: 1 / 1;
  opacity: 0;
  scale: var(--kernel-scale-enter);
  filter: blur(var(--kernel-blur-sm));
  transition:
    opacity var(--kernel-duration-fast) linear,
    scale var(--kernel-duration-base) var(--kernel-ease-in-out),
    filter var(--kernel-duration-fast) linear;
}

.root[data-status="running"] [data-kind="running"],
.root[data-status="pending"] [data-kind="pending"],
.root[data-status="complete"] [data-kind="complete"],
.root[data-status="error"] [data-kind="error"] {
  opacity: 1;
  scale: 1;
  filter: blur(0);
}

@media (prefers-reduced-motion: reduce) {
  .statusLayer,
  .labelLayer {
    scale: 1;
    filter: none;
    transition: opacity var(--kernel-duration-fast) linear;
  }
}
```

**Why these values:** 120ms linear opacity/filter keeps the swap crisp; 200ms `--kernel-ease-in-out` is for two states morphing while already on screen; `--kernel-scale-enter` (0.96) and `--kernel-blur-sm` (2px) match CodeBlock rather than transitions.dev's generic 0.25 icon scale, which is too theatrical for a dense activity stream.

## Conventions to follow

- Pattern source: transitions.dev `09-icon-swap.md` — persistent stacked layers driven by `data-state`, no JS timer.
- Repo exemplar: CodeBlock stacks both icon and label states; TodoList stacks all status marks.
- Reuse the existing `data-status` public hook; do not create `.is-exit`/`.is-enter` orchestration.
- The running dots and shimmer remain ambient loops only while their layer is active; pause hidden animations so invisible layers consume no work.

## Steps

1. Refactor React StatusLabel to render persistent pending/running/complete/error visual layers plus persistent shimmer/static label layers.
2. Refactor Elements to build those layers once in `connectedCallback`; on attribute changes update text and `data-status` without `replaceChildren()`.
3. Add grid stacking, fixed slot sizing, icon/text opacity-scale-blur transitions, semantic colors, and hidden-layer animation pausing to both CSS twins.
4. Preserve live-region semantics: only the actual status text update should be announced; hidden duplicate visual layers must be `aria-hidden`.
5. Add a demo/test control that cycles pending → running → complete and pending → running → error without remounting ToolCall.

## Out of scope

- Do not add transitions.dev's success-check celebration or path draw; repeated tool completions should remain restrained.
- Do not change disclosure height/chevron motion, labels, status API, or initial-open logic.
- Do not animate AgentActivity's delegated wrapper separately; ToolCall owns this status transition.
- Do not introduce a motion library or the transitions.dev universal root block; Kernel already owns equivalent semantic tokens.

## Verification

**Build**
- [ ] React and Elements typechecks/builds pass.
- [ ] Add/run ToolCall status transition tests.
- [ ] Docs typecheck passes after rebuilding packages.

**Behavior**
- [ ] Running → complete and running → error preserve one stable status slot with no layout jump.
- [ ] Rapid status reversal retargets from current opacity/scale instead of replaying keyframes.
- [ ] Hidden dots/shimmer are paused and do not remain in the accessibility tree.
- [ ] Static ToolCall and disclosure ToolCall behave identically.
- [ ] React and Elements remain visually equivalent.

**Feel**
- [ ] Record both status paths and scrub frame by frame; the old/new glyphs should overlap as one object, not appear sequentially.
- [ ] If the crossfade still reads as two icons, verify the 2px blur is active before changing duration.
- [ ] Test in a dense AgentActivity stream to ensure the effect is calm enough for repetition.

## Notes

This deliberately adapts transitions.dev to Kernel's existing tokens and permanent-layer convention. Copying the generic `t-*` selectors or universal variable block would create a parallel design system.
