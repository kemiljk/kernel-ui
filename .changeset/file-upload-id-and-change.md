---
"@kernelui-lib/elements": patch
---

Fix `id` handling and `change` events on elements that wrap a form control.

- **`id` stays on the host.** `<kernel-file-upload>`, `<kernel-text-field>`, `<kernel-textarea>`, `<kernel-select>`, `<kernel-number-field>`, `<kernel-slider>`, `<kernel-tag-input>`, `<kernel-color-picker>` and `<kernel-composer>` copied an author's `id` onto their inner control without removing it from the host. Two elements shared the id, and the element's own `<label for>` resolved to the host, which isn't labelable, so the control had no accessible name. The control now gets `<id>-control`, and `getElementById()` still returns the element.
- **`<kernel-file-upload>` fires `change` only for accepted files.** The inner input's native `change` used to bubble out through the host as well, including for a pick that failed validation, after `kernel-file-upload-error`. A host `change` listener that cleared the error wiped the message the error handler had just set. The native event now stops at the input; the host's own `change` still fires once per accepted selection or removal.
