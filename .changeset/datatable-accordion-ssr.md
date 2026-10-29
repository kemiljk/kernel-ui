---
"@kernelui-lib/react": patch
---

DataTable's filter and sort fallback now read the text inside rendered elements, so a cell that wraps its value in a link, `<code>` or Badge is still searchable and sortable (matching `<kernel-data-table>`). AccordionItem renders `defaultOpen` as the `open` attribute, so a default-open item is open in server-rendered HTML and without JavaScript instead of opening after hydration.
