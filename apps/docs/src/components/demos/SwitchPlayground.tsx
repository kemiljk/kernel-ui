import { Switch } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "children", label: "label", default: "Enable notifications" },
  { type: "boolean" as const, prop: "checked", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.checked) attrs.push("checked");
  if (values.disabled) attrs.push("disabled");
  const props = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<Switch${props}>${values.children || ""}</Switch>`;
}

export default function SwitchPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Switch
          checked={Boolean(values.checked)}
          disabled={Boolean(values.disabled)}
          onCheckedChange={() => {}}
        >
          {String(values.children)}
        </Switch>
      )}
    />
  );
}
