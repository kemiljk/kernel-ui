import { Select, SelectOption } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Country" },
  { type: "text" as const, prop: "description", default: "Used for shipping estimates." },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "Please choose a country.",
  },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hideLabel");
  return `<Select ${attrs.join(" ")}>
  <SelectOption value="uk">United Kingdom</SelectOption>
  <SelectOption value="us">United States</SelectOption>
  <SelectOption value="de">Germany</SelectOption>
</Select>`;
}

/** Real <option> children, not a kernel-select-option wrapper — a
 * native <select> only renders its own picker UI for direct
 * <option>/<optgroup> children (see KernelSelect's own doc comment). */
function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label || "Label"}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hide-label");
  return `<kernel-select ${attrs.join(" ")}>
  <option value="uk">United Kingdom</option>
  <option value="us">United States</option>
  <option value="de">Germany</option>
</kernel-select>`;
}

export default function SelectPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Select
          label={String(values.label) || "Label"}
          description={String(values.description)}
          invalid={Boolean(values.invalid)}
          errorMessage={String(values.errorMessage)}
          required={Boolean(values.required)}
          disabled={Boolean(values.disabled)}
          hideLabel={Boolean(values.hideLabel)}
        >
          <SelectOption value="uk">United Kingdom</SelectOption>
          <SelectOption value="us">United States</SelectOption>
          <SelectOption value="de">Germany</SelectOption>
        </Select>
      )}
    />
  );
}
