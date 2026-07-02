import { Button, DropdownMenu, MenuItem, MenuSeparator } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "triggerLabel", label: "trigger text", default: "Actions ▾" },
];

function code(values: PlaygroundValues) {
  return `<DropdownMenu render={<Button variant="secondary">${values.triggerLabel}</Button>}>
  <MenuItem onSelect={() => {}}>Edit</MenuItem>
  <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
  <MenuSeparator />
  <MenuItem destructive onSelect={() => {}}>
    Delete
  </MenuItem>
</DropdownMenu>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-dropdown-menu>
  <kernel-button slot="trigger" variant="secondary">${values.triggerLabel}</kernel-button>
  <kernel-menu-item>Edit</kernel-menu-item>
  <kernel-menu-item>Duplicate</kernel-menu-item>
  <kernel-menu-separator></kernel-menu-separator>
  <kernel-menu-item destructive>Delete</kernel-menu-item>
</kernel-dropdown-menu>`;
}

export default function DropdownMenuPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <DropdownMenu render={<Button variant="secondary">{String(values.triggerLabel)}</Button>}>
          <MenuItem onSelect={() => {}}>Edit</MenuItem>
          <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
          <MenuSeparator />
          <MenuItem destructive onSelect={() => {}}>
            Delete
          </MenuItem>
        </DropdownMenu>
      )}
    />
  );
}
