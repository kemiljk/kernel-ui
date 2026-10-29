import { Slider } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "enum" as const, prop: "variant", options: ["default", "inset"], default: "default" },
  { type: "text" as const, prop: "label", default: "Volume" },
  { type: "text" as const, prop: "startLabel", label: "start label (inset)", default: "Low" },
  { type: "text" as const, prop: "endLabel", label: "end label (inset)", default: "High" },
  { type: "number" as const, prop: "min", default: 0, step: 1 },
  { type: "number" as const, prop: "max", default: 100, step: 1 },
  { type: "number" as const, prop: "step", default: 1, min: 1 },
  { type: "boolean" as const, prop: "showValue", default: true },
  { type: "boolean" as const, prop: "hideLabel", label: "hide label", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, "defaultValue={50}"];
  if (values.variant === "inset") {
    attrs.push(`variant="inset"`);
    if (values.startLabel) attrs.push(`startLabel="${values.startLabel}"`);
    if (values.endLabel) attrs.push(`endLabel="${values.endLabel}"`);
  }
  if (Number(values.min) !== 0) attrs.push(`min={${Number(values.min)}}`);
  if (Number(values.max) !== 100) attrs.push(`max={${Number(values.max)}}`);
  if (Number(values.step) !== 1) attrs.push(`step={${Number(values.step)}}`);
  if (values.showValue) attrs.push("showValue");
  if (values.hideLabel) attrs.push("hideLabel");
  return `<Slider ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`label="${values.label}"`, `value="50"`];
  if (values.variant === "inset") {
    attrs.push(`variant="inset"`);
    if (values.startLabel) attrs.push(`start-label="${values.startLabel}"`);
    if (values.endLabel) attrs.push(`end-label="${values.endLabel}"`);
  }
  if (Number(values.min) !== 0) attrs.push(`min="${Number(values.min)}"`);
  if (Number(values.max) !== 100) attrs.push(`max="${Number(values.max)}"`);
  if (Number(values.step) !== 1) attrs.push(`step="${Number(values.step)}"`);
  if (values.showValue) attrs.push("show-value");
  if (values.hideLabel) attrs.push("hide-label");
  return `<kernel-slider ${attrs.join(" ")}></kernel-slider>`;
}

export default function SliderPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ width: "100%" }}>
          <Slider
            label={String(values.label)}
            variant={values.variant === "inset" ? "inset" : "default"}
            startLabel={values.startLabel ? String(values.startLabel) : undefined}
            endLabel={values.endLabel ? String(values.endLabel) : undefined}
            defaultValue={50}
            min={Number(values.min)}
            max={Number(values.max)}
            step={Number(values.step)}
            showValue={Boolean(values.showValue)}
            hideLabel={Boolean(values.hideLabel)}
          />
        </div>
      )}
    />
  );
}
