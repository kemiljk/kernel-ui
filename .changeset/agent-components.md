---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add five components, each in both packages: `Kbd` (keyboard keys and shortcuts on nested `<kbd>`, with a platform-aware `mod` key), `EmptyState` (a zero-data `<section>` named by its own heading), `ToolApproval` (approve / deny / always-allow before an agent runs a tool, with the outcome announced in a live region), `Attachment` + `AttachmentList` (file chips with middle-truncated names, `Intl` file sizes, image previews, native `<progress>` upload and a remove button), and `UsageMeter` (token or credit usage on a styled native `<meter>` with warning and danger bands). Also exports `formatFileSize`, `usageMeterLevel` and `resolveKbdKey` (React).
