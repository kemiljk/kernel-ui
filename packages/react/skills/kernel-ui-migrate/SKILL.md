---
name: kernel-ui-migrate
description: Move a React app from shadcn/ui or Radix Primitives onto Kernel UI (@kernelui-lib/react). Use when replacing @/components/ui/* or @radix-ui/react-* imports with Kernel components.
---

# Migrating to Kernel from shadcn/ui or Radix

Kernel ships as npm packages. It doesn't copy component source into your repo, so a migration swaps imports and props rather than editing local component files.

## Steps

1. **Find what to replace.** Run `npx @kernelui-lib/cli check <files>` (or the MCP `check_code` tool). It flags every `@/components/ui/*` and `@radix-ui/react-*` import that has a Kernel equivalent. `npx @kernelui-lib/cli doctor` gives a project-wide summary.
2. **Look up each mapping.** `npx @kernelui-lib/cli docs <shadcn-name>` accepts shadcn names: `input` resolves to TextField and `sheet` to Sheet. It lists the Kernel exports and migration caveats. MCP `get_component` gives the same, with exact props.
3. **Swap one component at a time,** then run `kernel check` again. It reports leftover foreign props with Kernel's name for each.

## Prop translations you'll meet most

| shadcn / Radix | Kernel |
| --- | --- |
| `asChild` + child element | `render={<a href="…" />}` |
| `<Button size="icon">` with an icon child | `<Button aria-label="…" iconStart={<Icon />} />` |
| Icon placed inside button text | `iconStart` / `iconEnd` |
| `onCheckedChange` on Checkbox / Switch | same name, `onCheckedChange` |
| `Select` / `SelectTrigger` / `SelectContent` / `SelectItem` | `<Select label="…">` with `SelectOption` children (a real `<select>`) |
| `Dialog` + `DialogTrigger` + `DialogContent` | `<Dialog open onOpenChange title description>`, with your own trigger `Button` |
| `Input` + `Label` + `FormMessage` | `<TextField label description invalid errorMessage>` |
| `cn()` / `className` overrides with Tailwind colours | Kernel tokens: `var(--kernel-color-*)`, or the Tailwind bridge `@kernelui-lib/styles/tailwind.css` |

## Things that work differently on purpose

- **Fields always have a label.** Every field takes `label`, even when it's hidden with `hideLabel`. shadcn's bare `<Input placeholder>` pattern has no direct equivalent.
- **Overlays are native.** They use `<dialog>` and the Popover API, so focus trapping, Escape and the top layer come from the browser. Don't port Radix portal or focus-trap workarounds.
- **Styling is by tokens, not variant props.** Colour and radius come from tokens, so you don't need a CVA variant per colour.
- **Keep the styles import.** Remove `components/ui/*` files only once nothing imports them. Kernel's styles come from `@kernelui-lib/styles` and `@kernelui-lib/react/styles.css`.
