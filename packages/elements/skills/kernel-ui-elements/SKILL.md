---
name: kernel-ui-elements
description: Build UI with Kernel UI's framework-free Custom Elements (@kernelui-lib/elements, <kernel-*> tags) in plain HTML, Astro, Vue, Svelte or any framework. Use whenever a project depends on @kernelui-lib/elements.
---

# Building UI with Kernel Custom Elements

Each `<kernel-*>` tag builds and owns a real native element in the light DOM: `<kernel-button>` renders a genuine `<button>`. There's no shadow root, so the page's own CSS and Kernel's tokens reach everything.

## Setup

```html
<link rel="stylesheet" href="node_modules/@kernelui-lib/styles/src/index.css" />
<link rel="stylesheet" href="node_modules/@kernelui-lib/elements/dist/kernel.css" />
<script type="module">import "@kernelui-lib/elements";</script>
```

Bundlers can use `import "@kernelui-lib/styles"`, `import "@kernelui-lib/elements/styles.css"` and `import "@kernelui-lib/elements"`.

## Workflow

1. **Pick tags first.** Use the `kernel` MCP server (`search_components`, then `get_component` with `platform: "elements"`), or read `node_modules/@kernelui-lib/elements/llms.txt`.
2. **Use real attributes.** They're kebab-case versions of React's props (`error-message`, `hide-label`). Booleans are presence-based (`<kernel-checkbox disabled>`), and string values go in attributes.
3. **Read rich values as DOM properties.** For example `tagInput.tags` returns an array, and CodeBlock takes `lines` or `code`.
4. **Listen to events.** React's `onValueChange` becomes a `change` event with `event.detail`. `get_component` lists each tag's events. Change events fire *before* the change commits, carry `event.detail.reason` (the same per-component strings as React's `ChangeDetails`, e.g. `"trigger-press" | "keyboard"`), and are cancelable: `event.preventDefault()` vetoes the change. Checkbox, RadioGroup, Select and NumberField add a cancelable `valuechange` ahead of the native `change`; Dialog/CommandPalette ask with `cancel`, Popover/DropdownMenu/Accordion items with `beforetoggle`.
5. **Review.** Run `npx @kernelui-lib/cli check <files>` and fix what it reports.

## Conventions

- **Structured content uses real children.** `<kernel-select>` takes `<option>`s, `<kernel-tabs>` takes `<kernel-tab>` and `<kernel-tab-panel>`, and triggers are children marked `slot="trigger"`.
- **Form fields always get a `label` attribute.** Use `hide-label` to hide it visually.
- **Icons.** No icon set ships with Kernel. Put an `<svg>` or `<img>` first or last inside `<kernel-button>`, `<kernel-badge>` or `<kernel-suggestion-item>`; mark any other icon element with `data-icon`. Give an icon-only `<kernel-button>` an `aria-label`.
- **Styling.** Style with `--kernel-*` tokens only, never hard-coded colours or radii. The component class names (`kernel-Button-root`…) are the same in the React package.
- **Framework bindings.** The tags work in any framework. In React 19 they're fine as plain JSX, though `@kernelui-lib/react` is usually the better fit there.
