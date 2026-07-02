import { ScrollArea } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const items = Array.from({ length: 18 }, (_, i) => `Item ${i + 1}`);

const controls = [
  { type: "text" as const, prop: "maxBlockSize", label: "max block size", default: "12rem" },
];

function code(values: PlaygroundValues) {
  return `<ScrollArea maxBlockSize="${values.maxBlockSize}">
  <ul>
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
</ScrollArea>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-scroll-area max-block-size="${values.maxBlockSize}">
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
        <ScrollArea maxBlockSize={String(values.maxBlockSize)} style={{ inlineSize: "16rem" }}>
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
