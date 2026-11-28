import { Button, DropdownMenu, Kbd, MenuChevron, MenuItem, MenuSeparator } from "@kernelui-lib/react";

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true">
      <path d={d} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function DropdownMenuDemo() {
  return (
    <DropdownMenu
      render={
        <Button variant="secondary" iconEnd={<MenuChevron />}>
          Actions
        </Button>
      }
    >
      <MenuItem onSelect={() => {}}>
        <Icon d="M10.5 3.5L12.5 5.5L6 12H4V10L10.5 3.5Z" />
        Edit
        <Kbd keys={["mod", "E"]} />
      </MenuItem>
      <MenuItem onSelect={() => {}}>
        <Icon d="M5.5 5.5V3.5H12.5V10.5H10.5M3.5 5.5H10.5V12.5H3.5V5.5Z" />
        Duplicate
        <Kbd keys={["mod", "D"]} />
      </MenuItem>
      <MenuSeparator />
      <MenuItem destructive onSelect={() => {}}>
        <Icon d="M3.5 4.5H12.5M6.5 4.5V3H9.5V4.5M5 4.5L5.5 13H10.5L11 4.5" />
        Delete
      </MenuItem>
    </DropdownMenu>
  );
}
