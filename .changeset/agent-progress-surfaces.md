---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Add the two surfaces that show an agent's work in progress.

`TodoList` / `TodoItem` is a task plan: a native `<details>` over a real
`<ol>`, with the completion count on the summary so a collapsed plan still
reports progress. All four status marks render at once and cross-fade on
`data-status`, so a status change is one attribute write with no JS in the
transition — and every item carries its status as real, visually hidden text,
because a shape and a colour are not a label. The count is derived from the
items themselves (via `MutationObserver` in the custom element), so updating a
task's status is the only thing a consumer has to do.

`AgentActivity` / `AgentActivityItem` is one chronological stream of reasoning,
searches, tool calls and traces, as a real `<ol>`. Reasoning and tool steps
delegate their bodies to the existing `Reasoning` and `ToolCall` components
rather than reimplementing disclosure, streaming and status behaviour, so those
two stay the single source of truth and stay usable standalone.

The `<details>`-based additions are covered by the repo's frame-by-frame
disclosure motion check.
