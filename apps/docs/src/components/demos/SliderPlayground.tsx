import { Slider } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Volume" },
  { type: "number" as const, prop: "min", default: 0, step: 1 },
  { type: "number" as const, prop: "max", default: 100, step: 1 },
  { type: "number" as const, prop: "step", default: 1, min: 1 },
  { type: "boolean" as const, prop: "showValue", default: true },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, "defaultValue={50}"];
  if (Number(values.min) !== 0) attrs.push(`min={${Number(values.min)}}`);
  if (Number(values.max) !== 100) attrs.push(`max={${Number(values.max)}}`);
  if (Number(values.step) !== 1) attrs.push(`step={${Number(values.step)}}`);
  if (values.showValue) attrs.push("showValue");
  return `<Slider ${attrs.join(" ")} />`;
}

export default function SliderPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <div style={{ width: "100%" }}>
          <Slider
            label={String(values.label)}
            defaultValue={50}
            min={Number(values.min)}
            max={Number(values.max)}
            step={Number(values.step)}
            showValue={Boolean(values.showValue)}
          />
        </div>
      )}
    />
  );
}
