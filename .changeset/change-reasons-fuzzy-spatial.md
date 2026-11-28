---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Change reasons, cancellable changes, fuzzy filtering and spatial grid navigation.

- **Change reasons.** Every change callback now receives a second argument, `details: ChangeDetails<Reason>` (`{ reason, event?, cancel(), isCanceled }`), with a per-component reason union — e.g. Tabs `"trigger-press" | "keyboard"`, Dialog `"close-button" | "escape-key" | "outside-press" | "programmatic"`, DropdownMenu `"item-press" | "item-keyboard" | …`. Callbacks run before the update; `details.cancel()` keeps the current state and skips side effects such as closing. One-argument callbacks are unaffected. `Select` gains `onValueChange`, `DropdownMenu`/`DropdownMenuMorph` and `AccordionItem` gain `onOpenChange`.
- **Custom elements.** Change events now fire before the change commits, carry `detail.reason`, and are cancelable (`event.preventDefault()`); event names are unchanged. Checkbox, RadioGroup, Select and NumberField add a cancelable `valuechange` ahead of the native `change`; Dialog, Sheet and CommandPalette ask with a cancelable `cancel`; Popover, DropdownMenu and Accordion items with `beforetoggle`.
- **Fuzzy filtering.** Combobox and CommandPalette rank results with a fuzzy matcher (subsequence, with bonuses for prefix, word starts and consecutive runs; case- and diacritic-insensitive) and underline matched characters. A `filter` prop/property replaces it. `fuzzyScore`, `fuzzyFilter` and `fuzzySegments` are exported from both packages. Combobox now clears its selection when the text field is emptied (reason `"clear"`).
- **Spatial navigation.** DatePicker and DateRangePicker arrow keys move by real row/column, so disabled days no longer push ArrowUp/Down a column off and Home/End stay in the visual week; Ctrl/Cmd+Home/End jump to the first/last day and Left/Right mirror in RTL. `spatialMove` and `gridDirectionForKey` are exported.
