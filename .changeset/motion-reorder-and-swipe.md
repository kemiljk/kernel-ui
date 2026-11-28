---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Motion for reordering and swiping.

- **TodoList** animates reorders. Any change to the items' order FLIP-animates with the Web Animations API, and new items fade in. Wrap the update in the new `animateTodoListChange(ref.current, update)` (React) or `todoList.animateChange(update)` (custom element) to run it as an element-scoped view transition where supported (`element.startViewTransition()`, Chrome 147+), falling back to the FLIP. Nothing moves under `prefers-reduced-motion`. React's `TodoList` now forwards its ref to the `<details>`.
- **Toast** swipe-to-dismiss now runs toward the viewport's edge only, rubber-bands the other way, and dismisses on 40% of the toast's width or a release faster than 0.5px/ms over the last 100ms of the gesture, with a reversal guard. It ignores presses on controls inside the toast, waits for 4px of mostly-horizontal travel before claiming the pointer, leaves vertical pans to the browser, and fades instead of following the pointer under reduced motion. The reduced-motion exit no longer slides.
- **Sheet** shares the same velocity tracking and dismiss decision (`gesture.ts`) with Toast; behaviour is unchanged.
- **Sheet** programmatic snapping now works on every side: a controlled `snap` (React) or `snapTo()` / the `snap` attribute (custom element) used to do nothing on top, left and right sheets, although dragging between their snap points worked.
