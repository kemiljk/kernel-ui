---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
"@kernelui-lib/cli": patch
---

Add two AI components, each in both packages. `StreamingMarkdown` (`<kernel-streaming-markdown>`) renders model Markdown as real elements while it streams: a built-in, dependency-free parser (paragraphs, headings, emphasis, inline and fenced code via `CodeBlock`, nested lists, blockquotes, safe links, GFM tables, rules) that never produces HTML, re-renders only the last block per chunk, renders unfinished syntax as its finished form, and fades new words in on the motion tokens. `ModelPicker` (`<kernel-model-picker>`) is a compact pill for a composer toolbar that opens a popover listbox of models with provider groups, descriptions, badges, icons, disabled options and typeahead. Also exports `parseMarkdown` and `safeHref` from both packages. The CLI's bundled registry lists both components.
