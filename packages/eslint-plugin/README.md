# @kernelui-lib/eslint-plugin

ESLint rules for [Kernel UI](https://www.kernelui.com). They catch the mistakes people and coding agents make most often with Kernel, and every message names the fix, so an agent running lint can correct itself.

```bash
npm install -D @kernelui-lib/eslint-plugin
```

```js
// eslint.config.js
import kernel from "@kernelui-lib/eslint-plugin";

export default [kernel.configs.recommended];
```

Components are recognised by their import from `@kernelui-lib/react` (aliases included), so components with the same name from other libraries are left alone. Exact props come from Kernel's source, bundled with the plugin version.

| Rule | Default | Catches |
| --- | --- | --- |
| `kernel/no-foreign-props` | error | Props from other libraries: `asChild` → `render`, `leftIcon` → `iconStart`, `isDisabled` → `disabled`… |
| `kernel/valid-prop-values` | error | `variant="primry"` → did you mean `"primary"`? |
| `kernel/field-requires-label` | error | Form fields without `label` (use `hideLabel` to hide it visually) |
| `kernel/icon-button-requires-label` | error | Icon-only `Button` without `aria-label` |
| `kernel/no-clickable-non-interactive` | error | `onClick` on a `<div>`/`<span>`: use `Button` |
| `kernel/no-unknown-props` | warn | Props a component doesn't have, with the closest real one |
| `kernel/no-raw-colors` | warn | Raw colours in inline styles instead of `--kernel-*` tokens |
| `kernel/prefer-kernel-components` | warn | shadcn/ui or Radix imports Kernel replaces |

The same checks without ESLint: `npx @kernelui-lib/cli check <files>`, or the `check_code` tool in Kernel's MCP server.
