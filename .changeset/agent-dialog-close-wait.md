---
"@kernelui-lib/agent": patch
---

`act()`'s `close` step on a `<dialog>` now waits for the dialog to actually close (its `open` attribute gone or its `close` event, up to 3 seconds) instead of returning as soon as the close button was pressed. Kernel's Dialog holds the native `close()` until its exit transition ends, which on a slow machine could land after `act()` had already taken its after-snapshot, so the step reported success with an empty diff. A close the page cancels now fails the step ("the dialog stayed open") rather than reporting success.
