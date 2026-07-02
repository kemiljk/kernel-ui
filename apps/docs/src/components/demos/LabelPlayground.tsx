import { Label } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "children", label: "text", default: "Email address" },
  { type: "boolean" as const, prop: "required", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.required) attrs.push(" required");
  return `<Label${attrs.join("")}>${values.children || "Label"}</Label>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.required) attrs.push(" required");
  return `<kernel-label${attrs.join("")}>${values.children || "Label"}</kernel-label>`;
}

export default function LabelPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Label required={Boolean(values.required)}>
          {String(values.children) || "Label"}
        </Label>
      )}
    />
  );
}
