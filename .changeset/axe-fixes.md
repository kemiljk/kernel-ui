---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Accessibility fixes found by the new axe check:

- ScrollArea, CodeBlock and FileDiff's scrolling regions can now be reached and scrolled by keyboard. CodeBlock and FileDiff name their region.
- DatePicker and DateRangePicker now use the ARIA grid pattern correctly. The table has `role="grid"`, `aria-selected` moved from the day button to its gridcell, and today's button gets `aria-current="date"`.
