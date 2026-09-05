import { Button, DropdownMenu, MenuItem } from "@kernelui-lib/react";

export default function DropdownMenuDisclosureDemo() {
  return (
    <DropdownMenu
      presentation="disclosure"
      align="start"
      render={<Button render={<summary />}>Navigation</Button>}
    >
      <MenuItem render={<a href="#disclosure-presentation" />}>Overview</MenuItem>
      <MenuItem render={<a href="#morph-variant" />}>Morph variant</MenuItem>
    </DropdownMenu>
  );
}
