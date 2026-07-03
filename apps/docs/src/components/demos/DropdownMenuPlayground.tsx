import { Button, DropdownMenu, MenuChevron, MenuItem, MenuSeparator } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "triggerLabel", label: "trigger text", default: "Actions" },
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  { type: "boolean" as const, prop: "destructive", label: "delete item destructive", default: true },
  { type: "boolean" as const, prop: "disabled", label: "duplicate item disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  const deleteAttrs: string[] = ["onSelect={() => {}}"];
  if (values.destructive) deleteAttrs.unshift("destructive");
  return `<DropdownMenu${attrs.length ? ` ${attrs.join(" ")}` : ""} render={<Button variant="secondary" iconEnd={<MenuChevron />}>${values.triggerLabel}</Button>}>
  <MenuItem onSelect={() => {}}>Edit</MenuItem>
  <MenuItem ${values.disabled ? "disabled " : ""}onSelect={() => {}}>Duplicate</MenuItem>
  <MenuSeparator />
  <MenuItem ${deleteAttrs.join(" ")}>
    Delete
  </MenuItem>
</DropdownMenu>`;
}

const chevronSvg = `<svg class="kernel-menu-chevron" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 6L8 10L12 6" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" /></svg>`;

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  return `<kernel-dropdown-menu${attrs.length ? ` ${attrs.join(" ")}` : ""}>
  <kernel-button slot="trigger" variant="secondary">
    ${values.triggerLabel}
    ${chevronSvg}
  </kernel-button>
  <kernel-menu-item>Edit</kernel-menu-item>
  <kernel-menu-item${values.disabled ? " disabled" : ""}>Duplicate</kernel-menu-item>
  <kernel-menu-separator></kernel-menu-separator>
  <kernel-menu-item${values.destructive ? " destructive" : ""}>Delete</kernel-menu-item>
</kernel-dropdown-menu>`;
}

export default function DropdownMenuPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <DropdownMenu
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          render={
            <Button variant="secondary" iconEnd={<MenuChevron />}>
              {String(values.triggerLabel)}
            </Button>
          }
        >
          <MenuItem onSelect={() => {}}>Edit</MenuItem>
          <MenuItem disabled={Boolean(values.disabled)} onSelect={() => {}}>
            Duplicate
          </MenuItem>
          <MenuSeparator />
          <MenuItem destructive={Boolean(values.destructive)} onSelect={() => {}}>
            Delete
          </MenuItem>
        </DropdownMenu>
      )}
    />
  );
}
