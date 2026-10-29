---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Tabs re-measures its selection indicator whenever the tab list changes size. A tab list first rendered inside a hidden container (a closed dialog, popover or `<details>`) used to measure every tab as 0px wide and show a zero-width sliver with no selected highlight until the selection changed; it now snaps into place when the container opens, and also follows font loading or the container resizing.
