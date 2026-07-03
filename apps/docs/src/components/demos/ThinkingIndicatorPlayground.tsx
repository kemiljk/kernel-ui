import { ThinkingIndicator } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [{ type: "text" as const, prop: "label", default: "Thinking" }];

function code(values: PlaygroundValues) {
  return values.label && values.label !== "Thinking"
    ? `<ThinkingIndicator label="${values.label}" />`
    : `<ThinkingIndicator />`;
}

function elementsCode(values: PlaygroundValues) {
  return values.label && values.label !== "Thinking"
    ? `<kernel-thinking-indicator label="${values.label}"></kernel-thinking-indicator>`
    : `<kernel-thinking-indicator></kernel-thinking-indicator>`;
}

export default function ThinkingIndicatorPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <ThinkingIndicator label={String(values.label)} />}
    />
  );
}
