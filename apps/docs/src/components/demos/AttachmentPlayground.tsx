import { Attachment } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { SAMPLE_PREVIEW } from "./AttachmentDemo";

const controls = [
  { type: "text" as const, prop: "name", default: "design-review-notes-2026.pdf" },
  { type: "number" as const, prop: "size", label: "size (bytes)", default: 1_250_000, min: 0, step: 50_000 },
  { type: "number" as const, prop: "progress", label: "progress (%)", default: 100, min: 0, max: 100, step: 10 },
  { type: "boolean" as const, prop: "removable", label: "onRemove", default: true },
  { type: "boolean" as const, prop: "preview", label: "previewSrc", default: false },
];

function progressOf(values: PlaygroundValues) {
  const percent = Number(values.progress);
  return percent >= 100 ? undefined : percent / 100;
}

function code(values: PlaygroundValues) {
  const attrs = [`name="${values.name}"`, `size={${values.size}}`];
  const progress = progressOf(values);
  if (progress != null) attrs.push(`progress={${progress}}`);
  if (values.preview) attrs.push("previewSrc={objectUrl}");
  if (values.removable) attrs.push("onRemove={remove}");
  return `<AttachmentList>\n  <Attachment ${attrs.join(" ")} />\n</AttachmentList>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`name="${values.name}"`, `size="${values.size}"`];
  const progress = progressOf(values);
  if (progress != null) attrs.push(`progress="${progress}"`);
  if (values.preview) attrs.push('preview-src="…"');
  if (values.removable) attrs.push("removable");
  return `<kernel-attachment-list>\n  <kernel-attachment ${attrs.join(" ")}></kernel-attachment>\n</kernel-attachment-list>`;
}

export default function AttachmentPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Attachment
          name={String(values.name)}
          size={Number(values.size)}
          progress={progressOf(values)}
          previewSrc={values.preview ? SAMPLE_PREVIEW : undefined}
          onRemove={values.removable ? () => {} : undefined}
        />
      )}
    />
  );
}
