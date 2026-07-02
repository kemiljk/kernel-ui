import { InputOTP } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "number" as const, prop: "length", default: 6, min: 4, max: 8, step: 1 },
  { type: "text" as const, prop: "label", default: "Verification code" },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`length={${Number(values.length)}}`];
  if (values.label) attrs.push(`label="${values.label}"`);
  if (values.disabled) attrs.push("disabled");
  return `<InputOTP ${attrs.join(" ")} />`;
}

export default function InputOTPPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <InputOTP
          length={Number(values.length)}
          label={String(values.label)}
          disabled={Boolean(values.disabled)}
        />
      )}
    />
  );
}
