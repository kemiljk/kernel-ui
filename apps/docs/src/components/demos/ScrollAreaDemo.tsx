import { ScrollArea } from "@kernelui/react";

const items = Array.from({ length: 18 }, (_, i) => `Item ${i + 1}`);

export default function ScrollAreaDemo() {
  return (
    <ScrollArea maxBlockSize="12rem" edgeShadow style={{ inlineSize: "16rem" }}>
      <ul style={{ margin: 0, padding: "0 0 0 1.25rem" }}>
        {items.map((item) => (
          <li key={item} style={{ padding: "0.25rem 0" }}>
            {item}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
