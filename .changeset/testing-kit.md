---
"@kernelui-lib/testing": minor
---

New package: `@kernelui-lib/testing`. `checkPattern(root, "tabs")` checks a rendered widget against its WAI-ARIA Authoring Practices pattern (roles and native elements, accessible names, state consistency, keyboard behaviour via dispatched key presses), `checkComponent(root, "Tabs")` adds Kernel's own invariants, and `checkPage()` finds and checks every Kernel component in a composed UI. Each has an `assert*` variant that throws a readable list of issues. Works in vitest or jest (jsdom, happy-dom) and in Playwright through `@kernelui-lib/testing/playwright` or the `@kernelui-lib/testing/browser` bundle; checks a simulated DOM can't run are reported as skipped, not passed.
