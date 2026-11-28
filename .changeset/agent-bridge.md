---
"@kernelui-lib/agent": minor
"@kernelui-lib/react": patch
---

New package `@kernelui-lib/agent`: an agent bridge that lets an in-page AI agent read and use your UI through its real semantics. `createAgentBridge()` returns `snapshot()` (roles, accessible names, values, states and stable refs, with password and card fields redacted), `act()` (press, type, select, check, open, close, submit… through real DOM events, with confirmation for risky steps), `query()`, `observe()`/`settle()`, and `registerTools()` for the experimental WebMCP API. Includes a `useAgentBridge` React hook at `@kernelui-lib/agent/react`. The `kernel-ui` skill now points to it.
