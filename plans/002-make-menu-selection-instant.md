# 002 — Make menu selection highlights instant

- **Commit:** 4292c7f
- **Severity:** HIGH
- **Category:** Purpose & frequency
- **Estimated scope:** 4 files, ~20 lines

## Problem

DropdownMenu items animate their background for 120ms while ArrowUp/ArrowDown/Home/End moves focus immediately. The highlight therefore trails keyboard selection, weakening the direct connection between keypress and active item; ContextMenu inherits the same item primitive.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `packages/react/src/components/DropdownMenu/DropdownMenu.module.css` | 71–98, 157–168 | Background and press-scale transition on each item |
| `packages/elements/src/components/DropdownMenu/DropdownMenu.css` | 75–102, 157–168 | Matching Custom Element item transition |
| `packages/react/src/components/DropdownMenu/DropdownMenu.tsx` | 40–70, 243–263 | Keyboard roving focus and `data-highlighted` |
| `packages/elements/src/components/DropdownMenu/DropdownMenu.ts` | 16–42, 287–298 | Matching Elements focus behavior |

### Current code

```css
.item {
  transition:
    background-color var(--kernel-duration-fast) var(--kernel-ease-out),
    scale var(--kernel-duration-fast) var(--kernel-ease-out);
}

.item[data-highlighted] {
  background-color: var(--kernel-color-accent-subtle);
}
```

## Target

Selection/hover background changes are instant. Preserve tactile pointer press feedback as the only item transition.

```css
.item {
  transition: scale var(--kernel-duration-fast) var(--kernel-ease-out);
}

@media (prefers-reduced-motion: reduce) {
  .item {
    transition: none;
  }

  .item:active:not(:disabled) {
    scale: 1;
  }
}
```

**Why these values:** active scale remains 120ms with Kernel's existing strong ease-out because it is direct pointer feedback; background selection has no duration because keyboard highlights must not trail.

## Conventions to follow

- Keep `--kernel-scale-press` for active feedback.
- ContextMenu imports/reuses DropdownMenu's MenuItem primitive; do not duplicate item CSS into ContextMenu.
- `DateRangePicker.module.css:114–125` documents the same principle: state that tracks pointer/selection movement lands instantly while true hover-only styling may animate.

## Steps

1. Remove `background-color` from the base item transition in React and Elements.
2. Change the reduced-motion item rule from a background transition to `transition: none`.
3. Keep the item press scale, destructive colors, focus ring, and menu panel open/close transitions unchanged.
4. Extend DropdownMenu tests to cover ArrowDown/Home/End state changes; use a browser computed-style assertion for the zero-duration background rather than relying on jsdom animation behavior.

## Out of scope

- Do not remove menu panel entrance/exit motion.
- Do not change Combobox or CommandPalette option styling; their active backgrounds are already instant.
- Do not change the documented DropdownMenuMorph surface transition.

## Verification

**Build**
- [ ] React and Elements typechecks/builds pass.
- [ ] DropdownMenu tests pass.
- [ ] `bun run test:shape` passes.

**Behavior**
- [ ] Arrow through a long menu: highlight and focus ring land in the same frame.
- [ ] Pointer hover also changes fill immediately.
- [ ] Pointer down still scales to `--kernel-scale-press`; reduced motion does not scale.
- [ ] ContextMenu receives the same behavior through the shared item primitive.

**Feel**
- [ ] Record rapid ArrowDown presses and scrub frame by frame; no previous row remains partially highlighted.
- [ ] Test both a normal and destructive item.

## Notes

The menu itself remains origin-aware and animated. Only the high-frequency selection cursor becomes instant.
