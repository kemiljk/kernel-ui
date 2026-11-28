---
"@kernelui-lib/elements": patch
---

Forward `aria-label`, `aria-labelledby` and `aria-describedby` from every element host to the native control it wraps.

An ARIA attribute left on a Custom Element host names nothing: the host is a generic wrapper, and assistive tech lands on the real `<button>`, `<input>` or `<select>` inside it. `<kernel-button>`, `<kernel-toggle>`, `<kernel-progress>` and the landmark elements forwarded `aria-label` one by one; `<kernel-switch>` didn't, so `<kernel-switch aria-label="Bill yearly">` rendered a switch with no accessible name. `KernelElement` now does the forwarding for every element that declares a native control (`ariaTarget()`), and handles all three attributes:

- Controls: Button, Toggle, Switch, Checkbox, TextField, Textarea, Select, NumberField, Slider, TagInput, ColorPicker, Combobox, FileUpload, Composer, RadioGroupItem, Tab and SuggestionItem.
- Groups and landmarks: InputOTP and RadioGroup (the `<fieldset>`), TabsList, Nav, Sidebar, Carousel, ScrollArea (the focusable scroll box) and Table.
- Values: Progress and UsageMeter.

An authored `aria-describedby` is added after a field's own hint and error ids rather than replacing them. On Composer, a host `aria-label` wins over the placeholder; on Progress, over `label`. The host keeps its copy of each attribute. The new `FORWARDED_ARIA_ATTRIBUTES` export lets a custom `KernelElement` subclass opt in the same way.
