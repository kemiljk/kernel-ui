import { Button, DropdownMenu, MenuChevron, MenuItem, MenuSeparator } from "@kernelui-lib/react";

export default function DropdownMenuDemo() {
  return (
    <DropdownMenu
      render={
        <Button variant="secondary" iconEnd={<MenuChevron />}>
          Actions
        </Button>
      }
    >
      <MenuItem onSelect={() => {}}>Edit</MenuItem>
      <MenuItem onSelect={() => {}}>Duplicate</MenuItem>
      <MenuSeparator />
      <MenuItem destructive onSelect={() => {}}>
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}
