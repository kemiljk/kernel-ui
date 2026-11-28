# @kernelui-lib/testing

## 0.1.0

### Minor Changes

- befd5fe: New package: `@kernelui-lib/testing`. `checkPattern(root, "tabs")` checks a rendered widget against its WAI-ARIA Authoring Practices pattern (roles and native elements, accessible names, state consistency, keyboard behaviour via dispatched key presses), `checkComponent(root, "Tabs")` adds Kernel's own invariants, and `checkPage()` finds and checks every Kernel component in a composed UI. Each has an `assert*` variant that throws a readable list of issues. Works in vitest or jest (jsdom, happy-dom) and in Playwright through `@kernelui-lib/testing/playwright` or the `@kernelui-lib/testing/browser` bundle; checks a simulated DOM can't run are reported as skipped, not passed.

### Patch Changes

- 7468dfd: Build scripts only, with no runtime change: these packages build the shared registry through `packages/registry/scripts/build-once.mjs`, so parallel builds no longer overwrite each other's output.
