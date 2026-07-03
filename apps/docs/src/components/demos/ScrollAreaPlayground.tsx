import { ScrollArea } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const items = Array.from({ length: 18 }, (_, i) => `Item ${i + 1}`);

const controls = [
  { type: "text" as const, prop: "maxBlockSize", label: "max block size", default: "12rem" },
  { type: "boolean" as const, prop: "edgeShadow", label: "edge shadow", default: true },
];

function code(values: PlaygroundValues) {
  return `<ScrollArea maxBlockSize="${values.maxBlockSize}" edgeShadow={${values.edgeShadow}}>
  <ul>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
</ScrollArea>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-scroll-area max-block-size="${values.maxBlockSize}"${values.edgeShadow ? " edge-shadow" : ""}>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
</kernel-scroll-area>`;
}

export default function ScrollAreaPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <ScrollArea
          maxBlockSize={String(values.maxBlockSize)}
          edgeShadow={Boolean(values.edgeShadow)}
          style={{ inlineSize: "16rem" }}
        >
          <ul style={{ margin: 0, padding: "0 0 0 1.25rem" }}>
            {items.map((item) => (
              <li key={item} style={{ padding: "0.25rem 0" }}>
                {item}
              </li>
            ))}
          </ul>
        </ScrollArea>
      )}
    />
  );
}
