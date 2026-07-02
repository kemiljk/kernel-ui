import { Textarea } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Message" },
  { type: "text" as const, prop: "placeholder", default: "Write something…" },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.placeholder) attrs.push(`placeholder="${values.placeholder}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  return `<Textarea ${attrs.join(" ")} />`;
}

export default function TextareaPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Textarea
          label={String(values.label) || "Label"}
          placeholder={String(values.placeholder)}
          required={Boolean(values.required)}
          disabled={Boolean(values.disabled)}
        />
      )}
    />
  );
}
