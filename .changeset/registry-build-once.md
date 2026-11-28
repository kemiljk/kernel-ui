---
"@kernelui-lib/agent": patch
"@kernelui-lib/testing": patch
"@kernelui-lib/cli": patch
"@kernelui-lib/elements": patch
---

Build scripts only, with no runtime change: these packages build the shared registry through `packages/registry/scripts/build-once.mjs`, so parallel builds no longer overwrite each other's output.
