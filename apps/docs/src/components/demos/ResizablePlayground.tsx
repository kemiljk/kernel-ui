import { Resizable } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "number" as const, prop: "defaultSplit", default: 40, min: 10, max: 90, step: 5 },
  { type: "number" as const, prop: "min", default: 20, min: 0, max: 50, step: 5 },
  { type: "number" as const, prop: "max", default: 80, min: 50, max: 100, step: 5 },
  {
    type: "enum" as const,
    prop: "orientation",
    options: ["horizontal", "vertical"],
    default: "horizontal",
  },
];

function code(values: PlaygroundValues) {
  const attrs = [`defaultSplit={${Number(values.defaultSplit)}}`, `min={${Number(values.min)}}`, `max={${Number(values.max)}}`];
  if (values.orientation !== "horizontal") attrs.push(`orientation="${values.orientation}"`);
  return `<Resizable ${attrs.join(" ")}>
  <div>Pane A</div>
  <div>Pane B</div>
</Resizable>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`default-split="${Number(values.defaultSplit)}"`, `min="${Number(values.min)}"`, `max="${Number(values.max)}"`];
  if (values.orientation !== "horizontal") attrs.push(`orientation="${values.orientation}"`);
  return `<kernel-resizable ${attrs.join(" ")}>
  <div>Pane A</div>
  <div>Pane B</div>
</kernel-resizable>`;
}

export default function ResizablePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ inlineSize: "100%", blockSize: "12rem" }}>
          <Resizable
            defaultSplit={Number(values.defaultSplit)}
            min={Number(values.min)}
            max={Number(values.max)}
            orientation={values.orientation as "horizontal" | "vertical"}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                blockSize: "100%",
                border: "1px solid var(--kernel-color-border)",
                backgroundColor: "var(--kernel-color-surface)",
              }}
            >
              Pane A
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                blockSize: "100%",
                border: "1px solid var(--kernel-color-border)",
                backgroundColor: "var(--kernel-color-surface-raised)",
              }}
            >
              Pane B
            </div>
          </Resizable>
        </div>
      )}
    />
  );
}
