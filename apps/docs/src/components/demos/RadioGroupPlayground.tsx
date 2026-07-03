import { RadioGroup, RadioGroupItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "label", label: "legend", default: "Notify me about" },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = [`label="${values.label || "Options"}"`, `defaultValue="all"`];
  if (values.disabled) attrs.push("disabled");
  return `<RadioGroup ${attrs.join(" ")}>
  <RadioGroupItem value="all">All new messages</RadioGroupItem>
  <RadioGroupItem value="mentions">Mentions only</RadioGroupItem>
  <RadioGroupItem value="none">Nothing</RadioGroupItem>
</RadioGroup>`;
}

/** `name` given explicitly here (rather than relying on the
 * auto-generated fallback) since a real usage example should show how
 * items actually get grouped, not lean on a detail that only exists to
 * cover the case where an author forgets it. */
function elementsCode(values: PlaygroundValues) {
  const attrs = [`label="${values.label || "Options"}"`, `name="notify"`];
  if (values.disabled) attrs.push("disabled");
  return `<kernel-radio-group ${attrs.join(" ")}>
  <kernel-radio-group-item value="all">All new messages</kernel-radio-group-item>
  <kernel-radio-group-item value="mentions">Mentions only</kernel-radio-group-item>
  <kernel-radio-group-item value="none">Nothing</kernel-radio-group-item>
</kernel-radio-group>`;
}

export default function RadioGroupPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <RadioGroup
          label={String(values.label) || "Options"}
          defaultValue="all"
          disabled={Boolean(values.disabled)}
        >
          <RadioGroupItem value="all">All new messages</RadioGroupItem>
          <RadioGroupItem value="mentions">Mentions only</RadioGroupItem>
          <RadioGroupItem value="none">Nothing</RadioGroupItem>
        </RadioGroup>
      )}
    />
  );
}
