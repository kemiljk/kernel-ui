import { Badge } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { CheckIcon } from "../icons";

const controls = [
  {
    type: "enum" as const,
    prop: "variant",
    options: ["neutral", "accent", "success", "warning", "danger"],
    default: "neutral",
  },
  { type: "text" as const, prop: "children", label: "label", default: "Active" },
  {
    type: "enum" as const,
    prop: "icon",
    options: ["none", "start", "end", "only"],
    default: "none",
  },
];

// Placeholder for whatever icon set the app uses — any <svg>, <img> or
// icon component works the same way.
const ICON = "<CheckIcon />";
const ICON_HTML = '<svg viewBox="0 0 15 15" aria-hidden="true">…</svg>';

function content(values: PlaygroundValues, icon: string) {
  const label = String(values.children || "Badge");
  switch (values.icon) {
    case "start":
      return `${icon} ${label}`;
    case "end":
      return `${label} ${icon}`;
    case "only":
      return icon;
    default:
      return label;
  }
}

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.variant !== "neutral") attrs.push(`variant="${values.variant}"`);
  const open = attrs.length ? `<Badge ${attrs.join(" ")}>` : "<Badge>";
  return `${open}${content(values, ICON)}</Badge>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.variant !== "neutral") attrs.push(`variant="${values.variant}"`);
  const open = attrs.length ? `<kernel-badge ${attrs.join(" ")}>` : "<kernel-badge>";
  return `${open}${content(values, ICON_HTML)}</kernel-badge>`;
}

export default function BadgePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => {
        const label = String(values.children) || "Badge";
        const icon =
          values.icon === "only" ? (
            <CheckIcon role="img" aria-hidden={false} aria-label={label} />
          ) : (
            <CheckIcon />
          );
        return (
          <Badge
            variant={
              values.variant as "neutral" | "accent" | "success" | "warning" | "danger"
            }
          >
            {values.icon === "start" ? icon : null}
            {values.icon === "only" ? icon : label}
            {values.icon === "end" ? icon : null}
          </Badge>
        );
      }}
    />
  );
}
