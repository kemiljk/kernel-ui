import { Button, Popover, TextField } from "@kernelui/react";

export default function PopoverDemo() {
  return (
    <Popover render={<Button variant="secondary">Filter</Button>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", minInlineSize: "14rem" }}>
        <TextField label="Search" placeholder="Filter results…" />
      </div>
    </Popover>
  );
}
