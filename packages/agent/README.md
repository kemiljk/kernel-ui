# @kernelui-lib/agent

Let an AI agent running in the page read your UI and use it, through the same semantics a screen reader uses: roles, accessible names and states. There's no separate store of "agent state" to keep in sync. It works best with [Kernel UI](https://www.kernelui.com), whose components are real `<button>`s, `<select>`s and `<dialog>`s, and it works with any well-built HTML.

Zero runtime dependencies. ESM with types. React hook included.

```bash
npm install @kernelui-lib/agent
```

```ts
import { createAgentBridge, formatSnapshot } from "@kernelui-lib/agent";

const agent = createAgentBridge({ root: document.querySelector("main") });

formatSnapshot(agent.snapshot());
// - form "Account settings" [ref=e1]
//   - textbox "Name" [ref=e2] value="" (TextField)
//   - combobox "Plan" [ref=e3] value="Free" options=["Free", "Pro", "Team"] (Select)
//   - switch "Email me product updates" [ref=e4] checked=false (Switch)
//   - button "Save settings" [ref=e6] (Button)

const result = await agent.act({
  steps: [
    { ref: "e2", action: "type", args: { text: "Ada Lovelace" } },
    { ref: "e4", action: "check" },
    { ref: "e3", action: "select", args: { value: "Team" } },
  ],
});
// result.results: one outcome per step; result.diff: what changed on screen

agent.registerTools(); // WebMCP tools, when the browser has the API
```

React:

```tsx
import { useAgentBridge } from "@kernelui-lib/agent/react";

const root = useRef<HTMLElement>(null);
const agent = useAgentBridge({ root, registerTools: true, confirm });
```

## API

| | |
| --- | --- |
| `createAgentBridge({ root, allow, confirm, include, exclude, maxNodes })` | Connects to the UI under `root` (default `document.body`) |
| `snapshot()` | Tree of controls, landmarks, headings and live regions, with role, name, value, state, options, Kernel `component`, and a stable `ref` per control |
| `act({ steps, continueOnError })` | Runs `press`, `type`, `clear`, `select`, `check`, `uncheck`, `toggle`, `open`, `close`, `focus`, `submit` or `scroll` through real DOM events, then returns per-step results and a diff |
| `query({ role, name, component, text })` | Matching nodes as a flat list |
| `observe(callback, { debounce })` / `settle({ quiet, timeout })` | Get told when the UI changes, or wait until it stops changing |
| `registerTools({ prefix })` | Registers `kernel_snapshot`, `kernel_query` and `kernel_act` with WebMCP. Returns an unregister function, and does nothing where WebMCP isn't available |
| `formatSnapshot`, `createTools`, `isWebMcpAvailable` | Compact outline, plain tool definitions for any tool-calling API, and feature detection |

## Security

- Only content inside `root` is visible or usable. `exclude` and `data-kernel-agent-ignore` remove a subtree; `include` limits which controls get refs.
- Hidden and disabled targets are refused, just as a person couldn't use them.
- Submitting a form, pressing a danger-variant button, and anything inside `data-kernel-agent-confirm` go through `confirm` before they run. `allow` can refuse a step, run it, or ask first, but it can't skip an explicit marker. The default `confirm` is `window.confirm`; in an app, render Kernel's `ToolApproval` outside `root`.
- Password, one-time-code and card fields, and anything with `data-kernel-agent-redact`, show as `"[redacted]"`.
- Snapshot text is page content. Treat it as data, not instructions; the WebMCP tools carry `untrustedContentHint`.

WebMCP ([explainer](https://github.com/webmachinelearning/webmcp), [draft](https://webmachinelearning.github.io/webmcp/)) is experimental. The bridge targets `document.modelContext.registerTool(tool, { signal })` and falls back to `navigator.modelContext` from early previews.

Guide and live demo: https://www.kernelui.com/agent-bridge/
