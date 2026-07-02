import { RadioGroup, RadioGroupItem } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", label: "legend", default: "Notify me about" },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = [`label="${values.label || "Options"}"`, `defaultValue="all"`];
  if (values.disabled) attrs.push("disabled");
  return `<RadioGroup ${attrs.join(" ")}>
  <RadioGroupItem value="all">All new messages</RadioGroupItem>
  <RadioGroupItem value="mentions">Mentions only</RadioGroupItem>
  <RadioGroupItem value="none">Nothing</RadioGroupItem>
</RadioGroup>`;
}

export default function RadioGroupPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <RadioGroup
          label={String(values.label) || "Options"}
          defaultValue="all"
          disabled={Boolean(values.disabled)}
        >
          <RadioGroupItem value="all">All new messages</RadioGroupItem>
          <RadioGroupItem value="mentions">Mentions only</RadioGroupItem>
          <RadioGroupItem value="none">Nothing</RadioGroupItem>
        </RadioGroup>
      )}
    />
  );
}
