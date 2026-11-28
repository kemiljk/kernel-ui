---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add `ArtifactPanel` / `<kernel-artifact-panel>` and `SchemaRenderer` / `<kernel-schema-renderer>`.

- **ArtifactPanel**: the side panel beside a chat that shows a generated artifact. A title, a version switcher ("v3 of 5"), your own actions, a built-in close button and Preview/Code views on Kernel's Tabs. It's a docked `<aside>` on wide screens (made to sit in a `Resizable` pane) and a modal `<dialog>` sheet below `overlayBelow` (768px by default), with `presentation="auto" | "docked" | "overlay"`. A `status` of `"streaming"` or `"error"` shows a small dot and short text in a polite live region.
- **SchemaRenderer**: renders a model's JSON with real Kernel components from a typed, versioned (`SCHEMA_VERSION = 1`) schema of 17 node types (Stack, Text, Heading, Button, Badge, Card, Form, TextField, Select, Checkbox, Switch, Table, Callout, Separator, Image, Link, Progress), each with an allow-list of props. Unknown types and props are dropped and reported through `onIssue` (or the `issue` event), URLs are sanitised to http(s), mailto: and relative, there's no raw HTML, and Buttons and Forms emit `onAction({ action, payload, values })` instead of executing anything. Also exports `parsePartialJson` for streaming, `validateSchemaNode`, `sanitizeSchema`, `sanitizeUrl`, `schemaPrompt` (a system-prompt snippet) and `kernelSchemaJson`, which is also shipped as `schema.json` in both packages.
