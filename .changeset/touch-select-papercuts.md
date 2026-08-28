---
"@kernelui-lib/styles": patch
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Stop tap flash and accidental text selection on clickable controls.

The reset now includes `label` (tapping a checkbox label highlighted the
label, not the input) plus the widget roles, kills the iOS long-press
callout on chrome, and sets `user-select: none` on buttons, summaries, and
labels. React and Web Components pair `-webkit-user-select` everywhere
selection is suppressed, including nav, breadcrumbs, and chips. Links stay
selectable so copying their text still works.
