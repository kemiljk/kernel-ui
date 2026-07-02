import { Reasoning } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "streaming", default: false },
  { type: "text" as const, prop: "durationLabel", default: "Thought for 4s" },
  { type: "boolean" as const, prop: "defaultOpen", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.streaming) attrs.push("streaming");
  if (values.durationLabel) attrs.push(`durationLabel="${values.durationLabel}"`);
  if (values.defaultOpen) attrs.push("defaultOpen");
  return `<Reasoning${attrs.length ? " " + attrs.join(" ") : ""}>\n  …\n</Reasoning>`;
}

export default function ReasoningPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Reasoning
          streaming={Boolean(values.streaming)}
          durationLabel={String(values.durationLabel)}
          defaultOpen={Boolean(values.defaultOpen)}
        >
          Weighing a few different approaches before picking the simplest one
          that actually fits the existing conventions.
        </Reasoning>
      )}
    />
  );
}
