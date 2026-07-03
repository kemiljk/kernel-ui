import { Progress } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "number" as const, prop: "value", default: 60, min: 0, max: 100, step: 1 },
  { type: "number" as const, prop: "max", default: 100, min: 1, max: 1000, step: 1 },
  { type: "boolean" as const, prop: "indeterminate", default: false },
  { type: "text" as const, prop: "label", default: "Uploading" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (!values.indeterminate) attrs.push(`value={${Number(values.value)}}`);
  if (Number(values.max) !== 100) attrs.push(`max={${Number(values.max)}}`);
  if (values.label) attrs.push(`label="${values.label}"`);
  return `<Progress${attrs.length ? " " + attrs.join(" ") : ""} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (!values.indeterminate) attrs.push(`value="${Number(values.value)}"`);
  if (Number(values.max) !== 100) attrs.push(`max="${Number(values.max)}"`);
  if (values.label) attrs.push(`label="${values.label}"`);
  return `<kernel-progress${attrs.length ? " " + attrs.join(" ") : ""}></kernel-progress>`;
}

export default function ProgressPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ width: "100%" }}>
          <Progress
            value={values.indeterminate ? undefined : Number(values.value)}
            max={Number(values.max)}
            label={String(values.label)}
          />
        </div>
      )}
    />
  );
}
