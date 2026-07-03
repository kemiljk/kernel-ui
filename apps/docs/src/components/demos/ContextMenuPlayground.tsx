import { ContextMenu, MenuItem, MenuSeparator } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "triggerText", label: "trigger area text", default: "Right-click here" },
];

function code(values: PlaygroundValues) {
  return `<ContextMenu render={<div>${values.triggerText}</div>}>
  <MenuItem onSelect={() => {}}>Copy</MenuItem>
  <MenuItem onSelect={() => {}}>Rename</MenuItem>
  <MenuSeparator />
  <MenuItem destructive onSelect={() => {}}>
    Delete
  </MenuItem>
</ContextMenu>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-context-menu>
  <div slot="trigger">${values.triggerText}</div>
  <kernel-menu-item>Copy</kernel-menu-item>
  <kernel-menu-item>Rename</kernel-menu-item>
  <kernel-menu-separator></kernel-menu-separator>
  <kernel-menu-item destructive>Delete</kernel-menu-item>
</kernel-context-menu>`;
}

export default function ContextMenuPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
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
              {String(values.triggerText)}
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
      )}
    />
  );
}
