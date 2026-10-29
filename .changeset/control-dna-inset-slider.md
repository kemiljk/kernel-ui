---
"@kernelui-lib/styles": minor
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add shared control tokens: `--kernel-control-height-sm/md/lg`, `--kernel-control-inset` and `--kernel-radius-control-inner` (control radius minus inset, so nested pieces stay concentric at every theme rounding). Button, Toggle, TextField, NumberField, Select, Combobox, ColorPicker, Pagination, Carousel and CommandPalette now read the height tokens instead of literal values.

Tabs now follows `--kernel-radius-control`: the list uses the control radius and height, and tabs and the indicator use `--kernel-radius-control-inner`, so a tab list is square at Sharp and a pill at Round, matching the buttons beside it. `TabsList` also takes `shape="pill"` (`shape="pill"` on `<kernel-tabs-list>`) for a fully rounded list whatever the theme.

Slider gains `variant="inset"` (`variant="inset"` on `<kernel-slider>`): a full-height track filled with the accent colour, dragged by a slim bar, with optional `startLabel`/`endLabel` (`start-label`/`end-label`) captions that change colour where the fill crosses them. When the drag bar would land on a caption, the bar steps aside at rest and the caption steps aside while the slider is hovered, dragged or keyboard-focused. The default slider's fill now lines up with the thumb's centre, its focus ring shows again in Chromium and Safari, and server-rendered sliders show the right fill before hydration.

Shape drift fixes: Pagination items use `--kernel-radius-control` like every other control; Combobox and CommandPalette options are now concentric with the surface around them (as Select's options already were); Switch derives its thumb gap from `--kernel-control-inset` and is square when the theme's control radius is 0 (still a pill in any rounded theme).
