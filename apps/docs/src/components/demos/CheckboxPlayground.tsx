import { Checkbox } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "children", label: "label", default: "Accept terms" },
  { type: "boolean" as const, prop: "checked", default: false },
  { type: "boolean" as const, prop: "indeterminate", default: false },
  { type: "boolean" as const, prop: "required", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "text" as const, prop: "name", default: "" },
  { type: "text" as const, prop: "value", default: "" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.checked) attrs.push("checked");
  if (values.indeterminate) attrs.push("indeterminate");
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.name) attrs.push(`name="${values.name}"`);
  if (values.value) attrs.push(`value="${values.value}"`);
  const props = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<Checkbox${props}>${values.children || ""}</Checkbox>`;
}

/** `indeterminate` has no HTML attribute on <kernel-checkbox> either
 * (same as the platform's own checkbox) — it's a live property only, so
 * it's left out of the markup here and noted as a comment instead. */
function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.checked) attrs.push("checked");
  if (values.required) attrs.push("required");
  if (values.disabled) attrs.push("disabled");
  if (values.name) attrs.push(`name="${values.name}"`);
  if (values.value) attrs.push(`value="${values.value}"`);
  const props = attrs.length ? ` ${attrs.join(" ")}` : "";
  const indeterminateNote = values.indeterminate
    ? "\n// indeterminate is a live property: el.indeterminate = true"
    : "";
  return `<kernel-checkbox${props}>${values.children || ""}</kernel-checkbox>${indeterminateNote}`;
}

export default function CheckboxPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Checkbox
          checked={Boolean(values.checked)}
          indeterminate={Boolean(values.indeterminate)}
          required={Boolean(values.required)}
          disabled={Boolean(values.disabled)}
          name={String(values.name)}
          value={String(values.value)}
          onCheckedChange={() => {}}
        >
          {String(values.children)}
        </Checkbox>
      )}
    />
  );
}
