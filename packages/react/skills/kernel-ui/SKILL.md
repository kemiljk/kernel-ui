---
name: kernel-ui
description: Build or change React UI with Kernel UI (@kernelui-lib/react), a component library on real semantic HTML. Use whenever a project depends on @kernelui-lib/react and you write or review screens, forms, dialogs, menus, tables or chat/agent UI.
---

# Building UI with Kernel

Kernel components wrap real elements: `<Button>` is a `<button>`, `<Dialog>` is a `<dialog>` opened with `showModal()`, and `<Select>` is a `<select>`. The browser already handles most behaviour, so your job is to choose the right component, pass the right props and style only with tokens.

## Workflow

1. **Check the setup once.** Both stylesheets must be imported, or components render unstyled (they still work):
   ```tsx
   import "@kernelui-lib/styles";           // tokens + reset
   import "@kernelui-lib/react/styles.css"; // component styles
   ```
   `npx @kernelui-lib/cli doctor` checks this.
2. **Pick components before writing markup.** If the `kernel` MCP server is connected, call `search_components` or `list_components`. Otherwise read `node_modules/@kernelui-lib/react/llms.txt`. Prefer a Kernel component over hand-rolled markup every time one exists.
3. **Get exact props, don't guess.** Use the MCP `get_component` tool, or `npx @kernelui-lib/cli docs <name> --markdown`, or the types in `node_modules/@kernelui-lib/react/dist/index.d.ts`. Props from other libraries (`asChild`, `leftIcon`, `isDisabled`, `colorScheme`) don't exist here.
4. **Style with tokens only.** Every colour, space, radius and duration is a `--kernel-*` custom property (MCP `get_tokens`). Never hard-code a hex colour, a pixel radius or `999px`.
5. **Review what you wrote.** Run the MCP `check_code` tool, or `npx @kernelui-lib/cli check <files>`, and fix every error it reports before you finish. If the project uses ESLint, `@kernelui-lib/eslint-plugin` (`kernel.configs.recommended`) runs the same checks on every save.
6. **Verify the rendered UI with `@kernelui-lib/testing`.** Static checks can't see keyboard behaviour. In the project's tests, `await assertPage(document.body, { act })` (or `assertComponent(container, "Tabs", { act })`) checks every Kernel component on screen against its WAI-ARIA pattern: names, state, arrow keys, Escape, focus. Each failure names the rule and the fix. Don't add one-off ARIA to make it pass; fix the props.

## Conventions that hold across components

- **State.** Use `value` / `defaultValue` / `onValueChange` for controlled or uncontrolled use. `onChange` stays the native DOM event. Toggles use `checked` / `defaultChecked` / `onCheckedChange`.
- **Change reasons.** Every change callback gets a second argument, `details: ChangeDetails<Reason>` = `{ reason, event?, cancel(), isCanceled }`. `reason` is a per-component string union (Tabs: `"trigger-press" | "keyboard"`; Dialog `onOpenChange`: `"close-button" | "escape-key" | "outside-press" | "programmatic"`; DropdownMenu adds `"item-press" | "item-keyboard"`). The callback runs *before* the update; `details.cancel()` keeps the current state and skips side effects such as closing. Use it instead of re-deriving intent from events:
  ```tsx
  <DropdownMenu render={<Button>Edit</Button>} onOpenChange={(open, d) => {
    if (!open && d.reason === "item-keyboard") d.cancel(); // stay open for keyboard users
  }}>…</DropdownMenu>
  ```
  In a controlled component, not updating your state already keeps the value; `cancel()` makes it explicit. Custom elements: the same `reason` is on the existing event's `detail`, and the event is cancelable (`event.preventDefault()`).
- **Filtering.** Combobox and CommandPalette rank results with a fuzzy match and underline matched characters. Pass `filter={(text, query) => score}` (0 hides) to replace it; `fuzzyScore` / `fuzzyFilter` are exported for your own lists.
- **Form fields** (TextField, Textarea, Select, Combobox, TagInput, NumberField, ColorPicker, Slider, FileUpload):
  - `label` is required: it's the accessible name, rendered as a real `<label>`. To hide it visually, use `hideLabel`. Never drop it.
  - The rest of the scaffold: `description`, `invalid` plus `errorMessage` (shown instead of the description), `disabled` and `required`.
- **Styling hooks.** `className` goes on the interactive element and accepts a string or `(state) => string`. Some components also take `wrapperClassName`. `ref` always reaches the real DOM element.
- **Different element.** Use `render`, not `asChild`: `<Button render={<a href="/pricing" />}>Pricing</Button>`.
- **Icons.** No icon set ships with Kernel. Pass any `svg`, `img` or icon component:
  - Button: through `iconStart` / `iconEnd`.
  - Badge, Suggestion and TagInput tags: as children, before or after the text, or alone.
  - Icon-only Buttons need `aria-label`.
  - `--kernel-icon-size` and `--kernel-icon-stroke-width` tune a whole icon set.
- **ARIA.** Don't add ARIA that the native element already provides, such as `role="button"` on `<Button>`.
- **One `<h1>` per page.** No Kernel component renders the page heading (`Header` is a landmark, not a heading), so add it yourself; axe flags a page without one.
- **Global setup.** Nothing needs a provider except `<ToastViewport>` (mount once, then call `toast()`) and `<CommandPalette>`.

## Choosing components for common jobs

| Job | Use |
| --- | --- |
| Action / navigation styled as a button | `Button` (`render={<a … />}` for links) |
| Text, email, password, search input | `TextField` |
| Pick one of a few / many options | `RadioGroup` / `Select` (native) / `Combobox` (filterable) |
| On/off setting | `Switch`; pressed state in a toolbar: `Toggle` |
| Modal task | `Dialog`; edge panel with drag-to-dismiss: `Sheet` |
| Anchored menu or panel | `DropdownMenu`, `Popover`, `Tooltip`, `HoverCard`, `ContextMenu` |
| Feedback | `Callout` (inline, announced), `toast()` (transient), `Progress`, `Skeleton` |
| Tabular data | `Table` (static) or `DataTable` (sorting and selection) |
| Chat / agent UI | `MessageList` + `Message` + `MessageBubble`, `Composer`, `MessageScroller`, `Suggestion`, `ThinkingIndicator`, `Reasoning`, `ToolCall`, `AgentActivity`, `TodoList`, `CodeBlock`, `FileDiff`, `Sources` |

## Layout and shape rules

- **Lay out with tokens.** Use your own flex and grid with `gap: var(--kernel-space-*)`.
- **Pair radius with padding.** If you round your own box with `--kernel-radius-container`, pad it with `--kernel-padding-container-curve`. With `--kernel-radius-sheet`, use `--kernel-padding-sheet-curve`. A radius picked without its paired padding looks cramped once the theme rounds its corners.
- **Nested controls.** Anything inside a rounded box needs at least `outer radius − inner radius` of inset at the corner.
- **Clickable elements are controls.** Never put `onClick` on a `<div>` or `<span>`: use `Button`.
- **Colours you add meet APCA.** Text needs Lc 75 (Lc 60 for secondary text), and thin outlines need Lc 45, with WCAG 2's 4.5:1 and 3:1 as floors. Kernel's own tokens already meet these, so prefer them.

## When you're unsure

Every component's JSDoc explains which native element it uses and why. Read it with MCP `get_component`, or in `dist/index.d.ts`, before you work around a component's behaviour.
