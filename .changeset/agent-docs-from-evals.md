---
"@kernelui-lib/cli": patch
"@kernelui-lib/elements": patch
"@kernelui-lib/react": patch
---

Agent docs and the MCP server cover what agents got wrong in the evals.

- **MCP `get_component`** for elements now lists every event a tag dispatches with the exact `event.detail` type, read from source with the type checker (`kernel-file-upload-error`: `{ type: "max-files" | "max-size" | "accept" | "directory"; files: File[] }`, `<kernel-tag-input>`'s `change`: `{ tags: string[] }`), and plain events as having no detail. When the registry records which ARIA attributes a tag forwards to its native control, it lists those too.
- **Elements skill and `llms.txt`**: a file upload recipe (show `kernel-file-upload-error` through `invalid`/`error-message`, clear it on the host's `change`, which fires only for accepted selections), accessible names set on the tag and forwarded to the control, `<kernel-switch>` named by its text or `aria-label`, and `id` staying on the tag.
- **React and elements skills**: a page needs one `<h1>`, which no component renders.
