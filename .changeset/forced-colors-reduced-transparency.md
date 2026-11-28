---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Forced colours (Windows High Contrast) and reduced transparency support.

- **Forced colours:** components that showed state only with a background, gradient or box-shadow now redraw it in system colours under `@media (forced-colors: active)`. Selected and on states use `Highlight`/`HighlightText`; edges use `CanvasText`. Covered: Switch (thumb and checked track), Checkbox, RadioGroup, Tabs (the selected tab fills itself, as the indicator needs script to size), Toggle, Slider (native and inset: track, fill, thumb), Progress (including indeterminate), Attachment's upload bar, Badge (outline), DropdownMenu and ContextMenu items and separators, CommandPalette and Combobox options, the customisable Select picker, Nav, NavigationMenu, Pagination, DatePicker and DateRangePicker days, Carousel dots, Separator, Skeleton, Resizable's divider, ColorPicker's swatch (keeps its real colour), Composer's border, CodeBlock's emphasised lines, and borders for Tooltip, Dialog, CommandPalette and Sheet. `forced-color-adjust: none` is used only where text sits on a `Highlight` fill (the browser otherwise paints a backplate over it), on the gradient-drawn Slider track and indeterminate Progress, and on ColorPicker's swatch.
- **Reduced transparency:** new `--kernel-opacity-glass` (85%) and `--kernel-opacity-frost` (70%) tokens. Header's sticky glass and the blurred Dialog and CommandPalette scrims read them, and under `prefers-reduced-transparency: reduce` they go to 100%, `--kernel-blur-backdrop` to 0 and `--kernel-color-scrim` to 80% black.
