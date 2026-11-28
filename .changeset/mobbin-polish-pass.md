---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Polish pass across ten components, matched in both packages:

- **DropdownMenu / ContextMenu**: compact rows (same rhythm as Combobox options), full-bleed separators, a muted 1rem slot for a leading icon, a trailing column for a `Kbd` or `[data-slot="shortcut"]` hint, and destructive rows keep their danger tint when reached from the keyboard.
- **Select**: compact picker rows; the checked option is marked by an accent checkmark and medium weight instead of the same fill as hover, so hover and selection no longer look alike.
- **Dialog**: the title's first line is optically centred on the close button, and the description sits closer to the title.
- **EmptyState**: title and description grouped tightly, balanced description lines, a hairline ring on the icon tile, and more room before the actions.
- **DatePicker / DateRangePicker**: borderless month navigation, tabular figures, and a smaller weekday header.
- **Pagination**: drawn chevrons (mirrored in RTL) replace the `‹`/`›` glyphs; the current page is medium weight.
- **Tooltip**: long content now wraps inside the bubble (balanced, up to 16rem) instead of overflowing it, and the bubble has a soft shadow.
- **Callout**: stroke icons in the variant's text colour replace the filled glyph discs, centred on the first line, with softer variant borders.
- **Breadcrumbs**: quieter separators with more room either side.
