import { UsageMeter } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", default: "Context window" },
  { type: "number" as const, prop: "value", default: 128_000, min: 0, max: 200_000, step: 8_000 },
  { type: "number" as const, prop: "max", default: 200_000, min: 1, step: 10_000 },
  { type: "number" as const, prop: "low", default: 0, min: 0, step: 10_000 },
  { type: "number" as const, prop: "high", default: 160_000, min: 0, step: 10_000 },
  { type: "text" as const, prop: "unit", default: "tokens" },
  { type: "boolean" as const, prop: "hideLabel", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = [`label="${values.label}"`, `value={${values.value}}`, `max={${values.max}}`];
  if (Number(values.low) > 0) attrs.push(`low={${values.low}}`);
  if (Number(values.high) > 0) attrs.push(`high={${values.high}}`);
  if (values.unit) attrs.push(`unit="${values.unit}"`);
  if (values.hideLabel) attrs.push("hideLabel");
  return `<UsageMeter\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`label="${values.label}"`, `value="${values.value}"`, `max="${values.max}"`];
  if (Number(values.low) > 0) attrs.push(`low="${values.low}"`);
  if (Number(values.high) > 0) attrs.push(`high="${values.high}"`);
  if (values.unit) attrs.push(`unit="${values.unit}"`);
  if (values.hideLabel) attrs.push("hide-label");
  return `<kernel-usage-meter\n  ${attrs.join("\n  ")}\n></kernel-usage-meter>`;
}

export default function UsageMeterPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ inlineSize: "min(100%, 24rem)" }}>
          <UsageMeter
            label={String(values.label)}
            value={Number(values.value)}
            max={Number(values.max)}
            low={Number(values.low) > 0 ? Number(values.low) : undefined}
            high={Number(values.high) > 0 ? Number(values.high) : undefined}
            unit={values.unit ? String(values.unit) : undefined}
            hideLabel={Boolean(values.hideLabel)}
          />
        </div>
      )}
    />
  );
}
