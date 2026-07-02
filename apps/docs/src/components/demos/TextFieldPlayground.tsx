import { TextField } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Email" },
  { type: "text" as const, prop: "placeholder", default: "you@example.com" },
  { type: "enum" as const, prop: "size", options: ["sm", "md", "lg"], default: "md" },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.placeholder) attrs.push(`placeholder="${values.placeholder}"`);
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  return `<TextField ${attrs.join(" ")} />`;
}

export default function TextFieldPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <TextField
          label={String(values.label) || "Label"}
          placeholder={String(values.placeholder)}
          size={values.size as "sm" | "md" | "lg"}
          required={Boolean(values.required)}
          disabled={Boolean(values.disabled)}
        />
      )}
    />
  );
}
