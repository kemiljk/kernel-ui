# 004 — Make Toast swipe frame-native

- **Commit:** 4292c7f
- **Severity:** HIGH
- **Category:** Performance
- **Estimated scope:** 4 files, ~100 lines

## Problem

React stores every swipe pixel in state, re-rendering ToastItem on each pointermove. Both implementations write an inheritable `--swipe-amount` custom property on the toast parent, forcing descendant style recalculation; the audit requires direct element transforms for live gestures.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `packages/react/src/components/Toast/Toast.tsx` | 173–174, 208–238, 240–259 | Per-move `setDragX()` and custom-property render |
| `packages/elements/src/components/Toast/ToastViewport.ts` | 203–241 | Per-move inherited custom-property write |
| `packages/react/src/components/Toast/Toast.module.css` | 61–73, 318–324 | `translate` composed from `--swipe-amount` and stack `--y` |
| `packages/elements/src/components/Toast/Toast.css` | 34–43, 240–242 | Matching Elements path |

### Current code

```tsx
const [dragX, setDragX] = useState(0);

function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
  if (!dragStart.current) return;
  setDragX(event.clientX - dragStart.current.x);
}

style={{ "--swipe-amount": `${dragX}px` } as CSSProperties}
```

```ts
el.style.setProperty("--swipe-amount", `${entry.dragX}px`);
```

## Target

Keep stack depth in CSS, but write the non-inheriting `translate` property directly to the toast element during the gesture. React state changes only at drag start/end. Compose the live X offset with the existing CSS `--y` stack offset and clean the inline property after a snap-back transition.

```ts
function writeSwipe(node: HTMLElement, x: number) {
  node.style.translate = `${x}px var(--y)`;
}

function clearSwipeAfterSettle(node: HTMLElement) {
  const onEnd = (event: TransitionEvent) => {
    if (event.target !== node || event.propertyName !== "translate") return;
    node.style.removeProperty("translate");
    node.removeEventListener("transitionend", onEnd);
  };
  node.addEventListener("transitionend", onEnd);
}
```

**Why these values:** pointer tracking has zero duration while `data-dragging` is present. Release reuses the existing 320ms `--kernel-duration-slow` + `--kernel-ease-spring` settle; no new timing or curve is introduced.

## Conventions to follow

- Follow Sheet's gesture boundary: direct DOM style while dragging, CSS transition after release.
- Preserve the current dismissal threshold (`40%` width) and velocity threshold (`0.5px/ms`).
- Preserve `--y` for depth/expanded-stack positioning; remove only `--swipe-amount`.

## Steps

1. Replace React `dragX` state with a ref and direct `element.style.translate` writes on pointermove.
2. Remove `--swipe-amount` from React render styles and from both base CSS translate expressions.
3. On release, remove `data-dragging` before writing the 0 or offscreen target so the existing transition is armed; mirror this carefully through React state reconciliation.
4. After a non-dismissed toast settles to X=0, remove the inline `translate` so normal stack updates fully return to CSS.
5. Apply the identical direct-property path in ToastViewport Elements.
6. Add pointercancel cleanup and tests for snap-back, left/right dismissal, and insertion of another toast during a drag.

## Out of scope

- Do not retune Toast's documented 0.8 entrance, stack depth, expansion, or success glyph.
- Do not change store timers, hover pause, close button, thresholds, or velocity calculation.
- Do not introduce a gesture/motion library.

## Verification

**Build**
- [ ] React and Elements typechecks/builds pass.
- [ ] Add/run Toast pointer interaction tests.
- [ ] Docs typecheck passes after rebuilding packages.

**Behavior**
- [ ] Toast tracks the pointer 1:1 with no spring lag while pressed.
- [ ] Releasing below threshold retargets smoothly to the current stacked Y position.
- [ ] Dismissal continues in the swipe direction and unmounts after the existing exit.
- [ ] A new toast arriving mid-drag does not erase X tracking or corrupt depth Y.
- [ ] pointercancel leaves no inline translate or `data-dragging` residue.

**Feel**
- [ ] Record a slow drag, fast flick, reversal, and cancel; scrub for jumps at press/release boundaries.
- [ ] In React Profiler, pointermove must produce no component commits.
- [ ] In Performance, descendants should not show style recalculation caused by an inherited swipe custom property.
- [ ] Test the gesture on a real touch device.

## Notes

Do not replace `translate` with a full-screen keyframe exit: CSS transitions are interruptible and retain the existing snap-back behavior.
