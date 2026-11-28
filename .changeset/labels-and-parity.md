---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Translatable built-in strings, and DOM parity fixes between the two packages.

- Every built-in English string (close buttons, "Remove {tag}", Copy/Copied, month navigation, pagination, carousel controls, and more) can now be overridden. React components take `labels?: Partial<<Name>Labels>` with an exported `<Name>Labels` type. Custom Elements read `label-<key>` attributes (`{param}` placeholders for interpolated strings) or a `labels` property. The defaults are unchanged.
- Elements now write `data-*` state hooks as `"true"`, like React, instead of `""`. They also omit `aria-invalid` and `data-loading` when false, use React's `data-opening` → `data-open` sequence on `<kernel-dialog>`, and put `data-disabled` on the `<kernel-toggle>`/`<kernel-switch>` button.
- `<kernel-toggle>` forwards `aria-label` to its button. `<kernel-radio-group>` gains a `value` attribute for the selected item.
- React `TagInput` chips carry `data-tag`, matching the element.
- React `Suggestion`'s `disabled` now disables every chip, so they can't be reached by keyboard. Before, it only blocked the pointer.
- Elements no longer emit `kernel-Accordion-title` or `kernel-Callout-content`. No styles target either class, and React never emitted them.
