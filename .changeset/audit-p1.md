---
"@kernelui-lib/styles": patch
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Fix layout, RTL and hit-area issues from a design audit.

- **Tabs**: a tablist wider than its container now scrolls sideways (hidden scrollbar, an edge fade only where tabs are cut off) instead of widening the page, and selecting a tab scrolls it into view. The sliding indicator now lands on the selected tab in right-to-left layouts.
- **InputOTP**: cells share the row (up to 48px each, never under 2rem) and stay square, so six cells fit on a 390px screen.
- **Pagination** (and DataTable's footer): stays on one line. Below a 30rem container width, Previous/Next show only their chevrons; the word stays available to assistive tech. The nav now fills its container's width and centres its pages.
- **Slider**: the fill meets the thumb in RTL.
- **Directional icons**: new `[data-icon-directional]` utility in `reset.css` mirrors an icon in RTL. DatePicker/DateRangePicker month arrows, Carousel prev/next and the Sources external-link arrow use it.
- **New token** `--kernel-color-overlay-hover`, a currentColor-based hover wash that stays visible in both colour schemes. TagInput's remove button uses it in place of a fixed black overlay that disappeared in dark mode.
- **Hit areas**: Carousel dots, citation chips and the Resizable divider keep their visual size but have a 24px target. DataTable sort buttons and Message's expand trigger are at least 24px tall. Carousel dots now sit on a 24px pitch.
- **Citation chips**: a small pill that fits two digits, raised without changing line height, with no gap before following punctuation.
- **AgentActivity**: its disclosure chevron sits at the end edge, like the nested Reasoning and ToolCall rows.
- **Toast**: descriptions on success, warning and danger toasts use the variant's text colour.
- **Resizable**: panes use the container radius, and the divider has a visible grip.
