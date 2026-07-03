import { Textarea } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Message" },
  { type: "text" as const, prop: "placeholder", default: "Write something…" },
  { type: "text" as const, prop: "description", default: "Markdown is supported." },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "A message is required.",
  },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.placeholder) attrs.push(`placeholder="${values.placeholder}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<Textarea ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.placeholder) attrs.push(`placeholder="${values.placeholder}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-textarea ${attrs.join(" ")}></kernel-textarea>`;
}

export default function TextareaPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Textarea
          label={String(values.label) || "Label"}
          placeholder={String(values.placeholder)}
          description={String(values.description)}
          invalid={Boolean(values.invalid)}
          errorMessage={String(values.errorMessage)}
          required={Boolean(values.required)}
          disabled={Boolean(values.disabled)}
          hideLabel={Boolean(values.hideLabel)}
          labelOffset={Boolean(values.labelOffset)}
        />
      )}
    />
  );
}
