---
"@kernelui-lib/elements": patch
---

Guard `Breadcrumbs`, `Nav`, and `Pagination` hover styles behind
`@media (hover: hover) and (pointer: fine)`, matching the React package.

Without the guard, `:hover` latches on touch devices: tapping a breadcrumb,
nav link, or pagination control left it stuck in its hover state until
something else was tapped. The React versions of all three were already
guarded — this closes the parity gap, so the two packages now render
identically on touch.
