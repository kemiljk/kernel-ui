---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

TagInput's text input is a real textbox again. It used to carry `role="listitem"` so the tag list would contain only listitems, which hid it from assistive tech as a text field. The tags now sit in their own `role="list"` (a `display: contents` wrapper, rendered only while there are tags) and the input is its sibling, keeping its native role, label and description. The layout is unchanged.
