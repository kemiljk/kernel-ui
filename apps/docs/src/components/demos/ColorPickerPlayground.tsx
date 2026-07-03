import { ColorPicker } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Accent color" },
  { type: "boolean" as const, prop: "showHexInput", default: true },
  { type: "enum" as const, prop: "size", options: ["sm", "md", "lg"], default: "md" },
  { type: "text" as const, prop: "description", default: "Used across buttons and links." },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "Choose a valid color.",
  },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `defaultValue="#f59e0b"`];
  if (!values.showHexInput) attrs.push("showHexInput={false}");
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<ColorPicker ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `value="#f59e0b"`];
  if (!values.showHexInput) attrs.push("no-hex-input");
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-color-picker ${attrs.join(" ")}></kernel-color-picker>`;
}

export default function ColorPickerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <ColorPicker
          label={String(values.label)}
          defaultValue="#f59e0b"
          showHexInput={Boolean(values.showHexInput)}
          size={values.size as "sm" | "md" | "lg"}
          description={String(values.description)}
          invalid={Boolean(values.invalid)}
          errorMessage={String(values.errorMessage)}
          hideLabel={Boolean(values.hideLabel)}
          labelOffset={Boolean(values.labelOffset)}
        />
      )}
    />
  );
}
