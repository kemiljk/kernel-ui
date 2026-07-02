import { Checkbox } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "children", label: "label", default: "Accept terms" },
  { type: "boolean" as const, prop: "checked", default: false },
  { type: "boolean" as const, prop: "indeterminate", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.checked) attrs.push("checked");
  if (values.indeterminate) attrs.push("indeterminate");
  if (values.disabled) attrs.push("disabled");
  const props = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<Checkbox${props}>${values.children || ""}</Checkbox>`;
}

export default function CheckboxPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Checkbox
          checked={Boolean(values.checked)}
          indeterminate={Boolean(values.indeterminate)}
          disabled={Boolean(values.disabled)}
          onCheckedChange={() => {}}
        >
          {String(values.children)}
        </Checkbox>
      )}
    />
  );
}
