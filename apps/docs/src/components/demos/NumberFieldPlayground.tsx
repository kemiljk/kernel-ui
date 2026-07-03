import { NumberField } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Quantity" },
  { type: "number" as const, prop: "min", default: 0, step: 1 },
  { type: "number" as const, prop: "max", default: 10, step: 1 },
  { type: "number" as const, prop: "step", default: 1, min: 1 },
  { type: "enum" as const, prop: "size", options: ["sm", "md", "lg"], default: "md" },
  { type: "text" as const, prop: "description", default: "How many would you like?" },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "Enter a value between 0 and 10.",
  },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, "defaultValue={1}"];
  attrs.push(`min={${Number(values.min)}}`);
  attrs.push(`max={${Number(values.max)}}`);
  if (Number(values.step) !== 1) attrs.push(`step={${Number(values.step)}}`);
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<NumberField ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `value="1"`];
  attrs.push(`min="${Number(values.min)}"`);
  attrs.push(`max="${Number(values.max)}"`);
  if (Number(values.step) !== 1) attrs.push(`step="${Number(values.step)}"`);
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-number-field ${attrs.join(" ")}></kernel-number-field>`;
}

export default function NumberFieldPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <NumberField
          label={String(values.label)}
          defaultValue={1}
          min={Number(values.min)}
          max={Number(values.max)}
          step={Number(values.step)}
          size={values.size as "sm" | "md" | "lg"}
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
