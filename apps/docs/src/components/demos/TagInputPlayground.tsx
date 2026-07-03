import { TagInput } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Skills" },
  { type: "number" as const, prop: "max", label: "max tags", default: 5, min: 1 },
  { type: "boolean" as const, prop: "allowDuplicates", default: false },
  { type: "text" as const, prop: "description", default: "Press Enter or comma to add a skill." },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "Add at least one skill.",
  },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `defaultValue={["React", "TypeScript"]}`];
  if (values.max) attrs.push(`max={${Number(values.max)}}`);
  if (values.allowDuplicates) attrs.push("allowDuplicates");
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<TagInput ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `value="React,TypeScript"`];
  if (values.max) attrs.push(`max="${Number(values.max)}"`);
  if (values.allowDuplicates) attrs.push("allow-duplicates");
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-tag-input ${attrs.join(" ")}></kernel-tag-input>`;
}

export default function TagInputPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <TagInput
          label={String(values.label)}
          defaultValue={["React", "TypeScript"]}
          max={Number(values.max)}
          allowDuplicates={Boolean(values.allowDuplicates)}
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
