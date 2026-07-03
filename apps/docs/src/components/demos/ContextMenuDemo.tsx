import { ContextMenu, MenuItem, MenuSeparator } from "@kernelui/react";

export default function ContextMenuDemo() {
  return (
    <ContextMenu
      render={
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            blockSize: "8rem",
            paddingInline: "var(--kernel-space-4)",
            border: "1px dashed var(--kernel-color-border-interactive)",
            borderRadius: "var(--kernel-radius-md)",
            color: "var(--kernel-color-text-muted)",
            fontSize: "var(--kernel-font-size-sm)",
          }}
        >
          Right-click here
        </div>
      }
    >
      <MenuItem onSelect={() => {}}>Copy</MenuItem>
      <MenuItem onSelect={() => {}}>Rename</MenuItem>
      <MenuSeparator />
      <MenuItem destructive onSelect={() => {}}>
        Delete
      </MenuItem>
    </ContextMenu>
  );
}
