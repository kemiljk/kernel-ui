---
"@kernelui-lib/react": patch
"@kernelui-lib/testing": patch
---

Adapt package tests for Vitest 4, which no longer re-exports Node types from its main entry. Add `@types/node` and switch schema/registry tests to `fileURLToPath` / `import.meta.url`.
