import { useState } from "react";
import { Button, CommandPalette } from "@kernelui-lib/react";
import type { CommandPaletteGroup, CommandPaletteItem } from "@kernelui-lib/react";

export default function CommandPaletteGroupsDemo() {
  const [open, setOpen] = useState(false);
  const [lastSelected, setLastSelected] = useState<string | null>(null);

  const groups: CommandPaletteGroup[] = [
    {
      id: "recent",
      label: "Recent",
      items: [
        { id: "save", label: "Save", description: "Save the current file", onSelect: () => setLastSelected("Save") },
      ],
    },
    {
      id: "file",
      label: "File",
      items: [
        { id: "new-file", label: "New file", description: "Create a new file", onSelect: () => setLastSelected("New file") },
        { id: "new-folder", label: "New folder", description: "Create a new folder", onSelect: () => setLastSelected("New folder") },
      ],
    },
    {
      id: "danger",
      label: "Danger zone",
      items: [
        { id: "delete", label: "Delete", description: "Delete the selected item", onSelect: () => setLastSelected("Delete") },
      ],
    },
  ];

  function renderItem(item: CommandPaletteItem, state: { group?: CommandPaletteGroup }) {
    return (
      <div style={{ color: state.group?.id === "danger" ? "var(--kernel-color-danger)" : undefined }}>
        <div>{item.label}</div>
        {item.description ? <div style={{ opacity: 0.7 }}>{item.description}</div> : null}
      </div>
    );
  }

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Open command palette
        </Button>
        {lastSelected ? <span>Last selected: {lastSelected}</span> : null}
      </div>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        groups={groups}
        renderItem={renderItem}
        placeholder="Filter commands"
      />
    </>
  );
}
