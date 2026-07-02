import { Progress } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "number" as const, prop: "value", default: 60, min: 0, max: 100, step: 1 },
  { type: "boolean" as const, prop: "indeterminate", default: false },
  { type: "text" as const, prop: "label", default: "Uploading" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (!values.indeterminate) attrs.push(`value={${Number(values.value)}}`);
  if (values.label) attrs.push(`label="${values.label}"`);
  return `<Progress${attrs.length ? " " + attrs.join(" ") : ""} />`;
}

export default function ProgressPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <div style={{ width: "100%" }}>
          <Progress
            value={values.indeterminate ? undefined : Number(values.value)}
            label={String(values.label)}
          />
        </div>
      )}
    />
  );
}
