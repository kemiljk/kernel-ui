# 001 — Make Command Palette open and close instantly

- **Commit:** 4292c7f
- **Severity:** HIGH
- **Category:** Purpose & frequency
- **Estimated scope:** 6 files, ~90 lines removed or simplified

## Problem

Command Palette is a keyboard-shortcut surface, but its default open path takes 200ms and its close path takes 150ms. Motion on an action invoked hundreds of times creates visible latency between the keypress and the focused command field; this category should be instant.

## Where

| File | Lines | What's there |
| --- | --- | --- |
| `packages/react/src/components/CommandPalette/CommandPalette.module.css` | 40–115 | Scale/translate/fade panel and scrim state machine |
| `packages/react/src/components/CommandPalette/CommandPalette.tsx` | 243–250, 298–320 | React closing state and exit wait |
| `packages/elements/src/components/CommandPalette/CommandPalette.css` | 39–114 | Matching Custom Element motion |
| `packages/elements/src/components/CommandPalette/CommandPalette.ts` | 162–190, 315–332 | Custom Element closing state and exit wait |
| `packages/react/src/components/CommandPalette/CommandPalette.test.tsx` | existing suite | Add immediate-close coverage |
| `apps/docs/src/components/CommandPalette.tsx` | 84–89 | Concrete ⌘/Ctrl+K high-frequency trigger for feel-check |

### Current code

```css
.content[data-state="open"] {
  opacity: 1;
  scale: 1;
  translate: 0 0;
  transition:
    opacity var(--kernel-duration-enter) var(--kernel-ease-overlay),
    scale var(--kernel-duration-enter) var(--kernel-ease-overlay),
    translate var(--kernel-duration-enter) var(--kernel-ease-overlay);
}

.content[data-state="closing"] {
  opacity: 0;
  scale: var(--kernel-scale-enter);
  translate: 0 0.5rem;
  transition:
    opacity var(--kernel-duration-exit) var(--kernel-ease-overlay),
    scale var(--kernel-duration-exit) var(--kernel-ease-overlay),
    translate var(--kernel-duration-exit) var(--kernel-ease-overlay);
}
```

```tsx
setClosing(true);
void (async () => {
  if (!prefersReducedMotion()) await waitForExitTransition(node, { signal: controller.signal });
  if (controller.signal.aborted) return;
  node.close();
  setClosing(false);
})();
```

## Target

The dialog becomes visible in its final geometry on the same update that calls `showModal()`, and `close()` runs immediately when `open` becomes false. Keep the native dialog backdrop and focus behavior, but remove the panel/scrim transitions, `@starting-style`, `will-change`, closing state, abort controller, and exit wait from both packages.

```css
.content {
  opacity: 1;
  scale: 1;
  translate: 0 0;
}

.content::backdrop {
  background-color: var(--kernel-color-scrim);
  opacity: 1;
}
```

```tsx
if (open) {
  if (!node.open) node.showModal();
  return;
}
if (node.open) node.close();
```

**Why these values:** zero duration is required because this is a shortcut-driven surface; retaining a tokenized 90–120ms fade would still animate the exact high-frequency action the audit excludes.

## Conventions to follow

- Keep the real `<dialog>` and its existing focus/reset logic.
- Preserve React/Custom Element behavioral parity.
- `packages/react/src/components/CommandPalette/CommandPalette.tsx` and its Elements twin already centralize all native open/close synchronization; simplify those paths instead of adding a new hook.

## Steps

1. Remove the panel and backdrop transition state machine, `@starting-style`, and persistent `will-change` declarations in both stylesheets.
2. Remove React's `closing`, `exitAbortRef`, `prefersReducedMotion`, and `waitForExitTransition` path; close the native dialog immediately.
3. Remove the Elements `closing`/abort/wait path and close immediately when `open` is removed.
4. Retain only state/data attributes that are part of the documented public styling API; update comments so none promise an exit animation.
5. Add a React test proving `dialog.open` is false immediately after the controlled prop flips false and Escape still calls `onOpenChange(false)`.

## Out of scope

- Do not change Dialog, Popover, menus, or other occasional overlays.
- Do not change filtering, arrow-key selection, focus restoration, or the docs shortcut.
- Do not introduce a motion library.

## Verification

**Build**
- [ ] React and Elements typechecks pass.
- [ ] React CommandPalette tests pass.
- [ ] React and Elements builds pass.
- [ ] Docs typecheck passes after rebuilding both packages.

**Behavior**
- [ ] ⌘/Ctrl+K shows the final palette and focused input without a settling frame.
- [ ] Escape and repeated ⌘/Ctrl+K close immediately; no invisible dialog/backdrop intercepts input.
- [ ] Rapid open → close → open leaves no stale `data-closing` state.
- [ ] React and `<kernel-command-palette>` match.

**Feel**
- [ ] Record ten rapid shortcut toggles and scrub frame by frame; every open frame is already at final scale/position.
- [ ] Verify on a real keyboard, not only by clicking the docs trigger.

## Notes

This intentionally does not apply transitions.dev's modal recipe. Frequency overrides surface type: a Command Palette looks modal, but behaves like a keyboard command.
