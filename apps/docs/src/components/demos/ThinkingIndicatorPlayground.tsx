import { ThinkingIndicator } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [{ type: "text" as const, prop: "label", default: "Thinking" }];

function code(values: PlaygroundValues) {
  return values.label && values.label !== "Thinking"
    ? `<ThinkingIndicator label="${values.label}" />`
    : `<ThinkingIndicator />`;
}

export default function ThinkingIndicatorPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => <ThinkingIndicator label={String(values.label)} />}
    />
  );
}
