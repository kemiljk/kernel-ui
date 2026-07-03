import { Badge } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "variant",
    options: ["neutral", "accent", "success", "warning", "danger"],
    default: "neutral",
  },
  { type: "text" as const, prop: "children", label: "label", default: "Active" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.variant !== "neutral") attrs.push(`variant="${values.variant}"`);
  const open = attrs.length ? `<Badge ${attrs.join(" ")}>` : "<Badge>";
  return `${open}${values.children || "Badge"}</Badge>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.variant !== "neutral") attrs.push(`variant="${values.variant}"`);
  const open = attrs.length ? `<kernel-badge ${attrs.join(" ")}>` : "<kernel-badge>";
  return `${open}${values.children || "Badge"}</kernel-badge>`;
}

export default function BadgePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Badge
          variant={
            values.variant as "neutral" | "accent" | "success" | "warning" | "danger"
          }
        >
          {String(values.children) || "Badge"}
        </Badge>
      )}
    />
  );
}
