# @kernelui-lib/agent

## 0.1.0

### Minor Changes

- 0744ef8: New package `@kernelui-lib/agent`: an agent bridge that lets an in-page AI agent read and use your UI through its real semantics. `createAgentBridge()` returns `snapshot()` (roles, accessible names, values, states and stable refs, with password and card fields redacted), `act()` (press, type, select, check, open, close, submit, setValue for sliders and number or date fields, key for single keypresses… through real DOM events, with confirmation for risky steps; open shadow roots are traversed as part of the page), `query()`, `observe()`/`settle()`, and `registerTools()` for the experimental WebMCP API. Includes a `useAgentBridge` React hook at `@kernelui-lib/agent/react`. The `kernel-ui` skill now points to it.

### Patch Changes

- 7468dfd: Build scripts only, with no runtime change: these packages build the shared registry through `packages/registry/scripts/build-once.mjs`, so parallel builds no longer overwrite each other's output.
