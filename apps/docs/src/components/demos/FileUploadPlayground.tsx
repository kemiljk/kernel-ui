import { FileUpload } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Upload files" },
  { type: "text" as const, prop: "description", default: "PNG or JPG, up to 5MB" },
  { type: "text" as const, prop: "accept", default: "image/*" },
  { type: "boolean" as const, prop: "multiple", default: true },
  { type: "number" as const, prop: "maxFiles", label: "max files", default: 3, min: 1 },
  { type: "number" as const, prop: "maxSizeMb", label: "max size (MB)", default: 5, min: 1 },
  { type: "boolean" as const, prop: "invalid", default: false },
  {
    type: "text" as const,
    prop: "errorMessage",
    label: "error message",
    default: "That file is too large.",
  },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
  { type: "boolean" as const, prop: "labelOffset", label: "label offset", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.accept) attrs.push(`accept="${values.accept}"`);
  if (values.multiple) attrs.push("multiple");
  if (values.maxFiles) attrs.push(`maxFiles={${Number(values.maxFiles)}}`);
  if (values.maxSizeMb) attrs.push(`maxSize={${Number(values.maxSizeMb) * 1024 * 1024}}`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`errorMessage="${values.errorMessage}"`);
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hideLabel");
  if (values.labelOffset === false) attrs.push("labelOffset={false}");
  return `<FileUpload ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.accept) attrs.push(`accept="${values.accept}"`);
  if (values.multiple) attrs.push("multiple");
  if (values.maxFiles) attrs.push(`max-files="${Number(values.maxFiles)}"`);
  if (values.maxSizeMb) attrs.push(`max-size="${Number(values.maxSizeMb) * 1024 * 1024}"`);
  if (values.invalid) attrs.push("invalid");
  if (values.errorMessage) attrs.push(`error-message="${values.errorMessage}"`);
  if (values.disabled) attrs.push("disabled");
  if (values.hideLabel) attrs.push("hide-label");
  if (values.labelOffset === false) attrs.push("no-label-offset");
  return `<kernel-file-upload ${attrs.join(" ")}></kernel-file-upload>`;
}

export default function FileUploadPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <FileUpload
          label={String(values.label)}
          description={String(values.description)}
          accept={String(values.accept)}
          multiple={Boolean(values.multiple)}
          maxFiles={Number(values.maxFiles)}
          maxSize={Number(values.maxSizeMb) * 1024 * 1024}
          invalid={Boolean(values.invalid)}
          errorMessage={String(values.errorMessage)}
          disabled={Boolean(values.disabled)}
          hideLabel={Boolean(values.hideLabel)}
          labelOffset={Boolean(values.labelOffset)}
        />
      )}
    />
  );
}
