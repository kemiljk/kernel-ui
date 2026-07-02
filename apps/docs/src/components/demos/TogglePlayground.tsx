import { Toggle } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "children", label: "label", default: "Bold" },
  { type: "enum" as const, prop: "size", options: ["sm", "md", "lg"], default: "md" },
  { type: "boolean" as const, prop: "pressed", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.size !== "md") attrs.push(`size="${values.size}"`);
  if (values.pressed) attrs.push("pressed");
  if (values.disabled) attrs.push("disabled");
  const props = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<Toggle${props}>${values.children || ""}</Toggle>`;
}

export default function TogglePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Toggle
          size={values.size as "sm" | "md" | "lg"}
          pressed={Boolean(values.pressed)}
          disabled={Boolean(values.disabled)}
          onPressedChange={() => {}}
        >
          {String(values.children)}
        </Toggle>
      )}
    />
  );
}
