---
"@kernelui-lib/react": minor
"@kernelui-lib/elements": minor
---

Make both packages better npm citizens.

- `@kernelui-lib/react`'s bundle now starts with `"use client"`, so Next.js App Router Server Components can import Kernel directly.
- Both packages add an opt-in `styles.layer.css` export: the same component CSS inside `@layer kernel.components`, ordered after `@kernelui-lib/styles`' token and reset layers, so any unlayered CSS you write overrides Kernel without specificity fights. `styles.css` is unchanged.
- `@kernelui-lib/elements` ships a Custom Elements Manifest (`custom-elements.json`, named by the `customElements` field), VS Code HTML custom data (`vscode.html-custom-data.json`) and React 19 JSX types for every tag (`@kernelui-lib/elements/jsx`), all generated from the elements' source.
