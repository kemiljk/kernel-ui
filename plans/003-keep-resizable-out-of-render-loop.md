# 003 — Keep Resizable drag updates out of render loops

- **Commit:** 4292c7f
- **Severity:** HIGH
- **Category:** Performance
- **Estimated scope:** 4 files, ~90 lines

## Problem

Resizable must update grid layout during a drag, but it currently adds avoidable framework and DOM reconciliation work to every pointer event. React calls `setSplit()` and re-renders the component per move; Elements calls its full `render()` and rewrites orientation, drag, and ARIA attributes per move.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `packages/react/src/components/Resizable/Resizable.tsx` | 43–57, 74–77, 106–128 | Per-move state update and render |
| `packages/elements/src/components/Resizable/Resizable.ts` | 91–100, 142–157 | Per-move full DOM render |
| `packages/react/src/components/Resizable/Resizable.module.css` | 1–15 | Grid reads `--kernel-resizable-split` |
| `packages/elements/src/components/Resizable/Resizable.css` | matching root rules | Matching Custom Element layout |

### Current code

```tsx
const [split, setSplit] = useState(() => clamp(defaultSplit, min, max));

function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
  if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
  updateFromPointer(event.clientX, event.clientY); // calls setSplit every move
}
```

```ts
this.split = clamp(percent, this.min, this.max);
this.render();
```

## Target

Pointer movement writes only the current split custom property and `aria-valuenow` on the two affected nodes. React commits component state once on release; Elements reserves `render()` for pointer start/end, keyboard changes, and attribute changes.

```tsx
const splitRef = useRef(clamp(defaultSplit, min, max));

function applyLiveSplit(next: number, divider: HTMLElement) {
  splitRef.current = next;
  rootRef.current?.style.setProperty("--kernel-resizable-split", `${next}%`);
  divider.setAttribute("aria-valuenow", String(Math.round(next)));
}

function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
  event.currentTarget.releasePointerCapture(event.pointerId);
  setSplit(splitRef.current);
  setDragging(false);
}
```

**Why these values:** there is no easing or duration during direct manipulation; the divider must track the pointer 1:1. The unavoidable grid layout remains, but React reconciliation and unrelated attribute writes leave the hot path.

## Conventions to follow

- Follow `packages/react/src/components/Sheet/useSheetDrag.ts` and `packages/elements/src/utils/sheetDrag.ts`: direct manipulation writes DOM styles while the finger is down and commits semantic state at boundaries.
- Keep keyboard changes stateful and instant; arrow-key resize is a discrete accessibility interaction, not a tween.
- Keep the custom property on the root because grid track sizing legitimately consumes it; only avoid full rendering around the write.

## Steps

1. Introduce a live split ref/helper in React that updates the root style and divider `aria-valuenow` directly during pointer movement.
2. Commit the final split to React state once on pointerup/cancel; preserve controlled min/max clamping and className state.
3. Split Elements' `render()` into a full sync and a minimal live-split write; call only the latter on pointermove.
4. Add pointercancel cleanup in both implementations so cursor/user-select state cannot stick.
5. Add tests/instrumentation proving a sequence of pointer moves yields one start and one end render/state commit, while the CSS property and ARIA value update on every move.

## Out of scope

- Do not replace the semantic `role="separator"` or grid implementation.
- Do not throttle with React state or add a spring; a drag is 1:1.
- Do not change min/max/defaultSplit API behavior.

## Verification

**Build**
- [ ] React and Elements typechecks/builds pass.
- [ ] Add and run Resizable interaction tests in the React suite.
- [ ] Docs typecheck passes after package rebuilds.

**Behavior**
- [ ] Pointer drag updates both panes continuously and `aria-valuenow` tracks the visible split.
- [ ] Pointerup and pointercancel restore body cursor/user selection.
- [ ] Arrow keys, Shift+Arrow, Home, and End remain instant and correctly clamped.
- [ ] React and Elements finish on the same percentage.

**Feel**
- [ ] Record a fast back-and-forth drag with a heavy child subtree and inspect for missed frames.
- [ ] Use Chrome Performance: pointermove must not contain React commits or Elements full `render()` calls.
- [ ] Test on a real touch device as well as desktop pointer input.

## Notes

Animating grid tracks on a live splitter is unavoidable because resizing layout is the feature. The fix is to remove work surrounding that layout, not fake the resize with a lagging transform.
