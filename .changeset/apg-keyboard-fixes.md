---
"@kernelui-lib/react": patch
"@kernelui-lib/elements": patch
---

Keyboard and ARIA fixes found by `@kernelui-lib/testing`:

- Tooltip: Escape now dismisses an open tooltip without moving focus (WCAG 1.4.13), and doesn't also close a dialog the trigger sits in.
- DatePicker and DateRangePicker: Home and End move to the first and last day of the focused week. They used to land on the wrong day whenever the month didn't start on a Sunday. The grid always has exactly one Tab stop: a month showing neither the selection nor today had none, and a range with both ends visible had two.
- ContextMenu (React): arrow keys, Home and End now move between items, as they do in DropdownMenu. Both packages move focus to the first item when the menu opens and return it when it closes, and `<kernel-context-menu>` gains Home and End.
- TextField, Textarea, NumberField, Select, TagInput and ColorPicker: with both `description` and an error showing, `aria-describedby` no longer points at the hidden description's missing id.
- Combobox (React compound API): `Combobox.Input` gets the id its label points at, so it's labelled, and its `aria-expanded` follows the list instead of always being `"true"`.
