import { useState } from "react";
import { Button, CommandPalette } from "@kernelui-lib/react";
import type { CommandPaletteItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "triggerLabel", label: "trigger text", default: "Open command palette" },
  { type: "text" as const, prop: "placeholder", default: "Filter commands" },
  { type: "text" as const, prop: "emptyMessage", label: "empty message", default: "No results" },
];

function code(values: PlaygroundValues) {
  return `<Button onClick={() => setOpen(true)}>${values.triggerLabel}</Button>
<CommandPalette
  open={open}
  onOpenChange={setOpen}
  items={items}
  placeholder="${values.placeholder}"
  emptyMessage="${values.emptyMessage}"
/>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-button id="open-palette">${values.triggerLabel}</kernel-button>
<kernel-command-palette id="palette" placeholder="${values.placeholder}" empty-message="${values.emptyMessage}"></kernel-command-palette>

<script type="module">
  const palette = document.getElementById("palette");
  palette.items = [
    { id: "new-file", label: "New file", onSelect: () => {} },
    { id: "save", label: "Save", description: "Save the current file", onSelect: () => {} },
  ];
  document.getElementById("open-palette").addEventListener("click", () => {
    palette.setAttribute("open", "");
  });
</script>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [open, setOpen] = useState(false);
  const items: CommandPaletteItem[] = [
    { id: "new-file", label: "New file", onSelect: () => {} },
    { id: "save", label: "Save", description: "Save the current file", onSelect: () => {} },
    { id: "delete", label: "Delete", onSelect: () => {} },
  ];

  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        {String(values.triggerLabel)}
      </Button>
      <CommandPalette
        open={open}
        onOpenChange={setOpen}
        items={items}
        placeholder={String(values.placeholder)}
        emptyMessage={String(values.emptyMessage)}
      />
    </>
  );
}

export default function CommandPalettePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <Stage values={values} />}
    />
  );
}
