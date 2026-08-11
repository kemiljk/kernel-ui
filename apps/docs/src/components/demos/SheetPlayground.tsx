import { useState } from "react";
import { Button, Sheet, type SheetSide } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "side",
    options: ["bottom", "top", "left", "right"],
    default: "bottom",
  },
  { type: "boolean" as const, prop: "showHandle", default: true },
  { type: "boolean" as const, prop: "handleOnly", default: false },
  { type: "boolean" as const, prop: "dismissible", default: true },
  { type: "boolean" as const, prop: "inset", default: false },
  { type: "boolean" as const, prop: "showCloseButton", default: true },
  {
    type: "enum" as const,
    prop: "backdrop",
    options: ["default", "blur", "opaque", "transparent"],
    default: "default",
  },
  { type: "boolean" as const, prop: "scrollingBody", default: true },
  { type: "boolean" as const, prop: "footer", default: false },
];

function attrsFor(values: PlaygroundValues, kebab: boolean) {
  const attrs: string[] = [];
  if (values.side !== "bottom") attrs.push(`side="${values.side}"`);
  const bool = (prop: string, attr: string, on: boolean) => {
    if (values[prop] === on) return;
    attrs.push(kebab ? `${attr}="${String(values[prop])}"` : `${prop}={${String(values[prop])}}`);
  };
  bool("showHandle", "show-handle", true);
  bool("handleOnly", "handle-only", false);
  bool("dismissible", "dismissible", true);
  bool("inset", "inset", false);
  bool("showCloseButton", "show-close-button", true);
  if (values.backdrop !== "default") attrs.push(`backdrop="${values.backdrop}"`);
  return attrs;
}

function code(values: PlaygroundValues) {
  const attrs = ['title="Recently played"', ...attrsFor(values, false)];
  return `<Sheet open={open} onOpenChange={setOpen} ${attrs.join(" ")}>
  ...
</Sheet>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = ['title="Recently played"', ...attrsFor(values, true)];
  return `<kernel-sheet open ${attrs.join(" ")}>
  ...
</kernel-sheet>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [open, setOpen] = useState(false);
  const rows = Array.from({ length: values.scrollingBody ? 24 : 3 }, (_, i) => `Track ${i + 1}`);

  return (
    <>
      <Button variant="primary" onClick={() => setOpen(true)}>
        Open sheet
      </Button>
      <Sheet
        open={open}
        onOpenChange={setOpen}
        title="Recently played"
        description="Drag toward the edge it's anchored to."
        side={values.side as SheetSide}
        showHandle={Boolean(values.showHandle)}
        handleOnly={Boolean(values.handleOnly)}
        dismissible={Boolean(values.dismissible)}
        inset={Boolean(values.inset)}
        showCloseButton={Boolean(values.showCloseButton)}
        footer={
          values.footer ? (
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Clear
              </Button>
              <Button variant="primary" onClick={() => setOpen(false)}>
                Checkout
              </Button>
            </div>
          ) : undefined
        }
        backdrop={values.backdrop as "default" | "blur" | "opaque" | "transparent"}
      >
        <ol style={{ display: "grid", gap: "0.75rem", margin: 0, paddingInlineStart: "1.75rem" }}>
          {rows.map((row) => (
            <li key={row}>{row}</li>
          ))}
        </ol>
        {!values.dismissible ? (
          <Button variant="primary" onClick={() => setOpen(false)} style={{ marginBlockStart: "1rem" }}>
            Done
          </Button>
        ) : null}
      </Sheet>
    </>
  );
}

export default function SheetPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <Stage values={values} />}
    />
  );
}
