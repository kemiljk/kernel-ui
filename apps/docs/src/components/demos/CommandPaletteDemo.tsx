import { useState } from "react";
import { Button, CommandPalette } from "@kernelui-lib/react";
import type { CommandPaletteItem } from "@kernelui-lib/react";

export default function CommandPaletteDemo() {
  const [open, setOpen] = useState(false);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const items: CommandPaletteItem[] = [
    { id: "new-file", label: "New file", description: "Create a new file", onSelect: () => setLastSelected("New file") },
    { id: "new-folder", label: "New folder", description: "Create a new folder", onSelect: () => setLastSelected("New folder") },
    { id: "save", label: "Save", description: "Save the current file", onSelect: () => setLastSelected("Save") },
    { id: "rename", label: "Rename", description: "Rename the selected item", onSelect: () => setLastSelected("Rename") },
    { id: "delete", label: "Delete", description: "Delete the selected item", onSelect: () => setLastSelected("Delete") },
    { id: "close-tab", label: "Close tab", description: "Close the current tab", onSelect: () => setLastSelected("Close tab") },
  ];

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open command palette
        </Button>
        {lastSelected ? <span>Last selected: {lastSelected}</span> : null}
      </div>
      <CommandPalette open={open} onOpenChange={setOpen} items={items} placeholder="Filter commands" />
    </>
  );
}
