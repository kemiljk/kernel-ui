import { Button, DropdownMenu, MenuItem, MenuSeparator } from "@kernelui/react";

export default function DropdownMenuDemo() {
  return (
    <DropdownMenu render={<Button variant="secondary">Actions ▾</Button>}>
      <MenuItem onSelect={() => {}}>Edit</MenuItem>
      <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem destructive onSelect={() => {}}>
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}
