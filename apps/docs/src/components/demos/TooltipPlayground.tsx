import { Button, Tooltip } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "content", default: "Copies the current URL" },
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "top",
  },
  { type: "text" as const, prop: "trigger", label: "trigger label", default: "Share" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`content="${values.content}"`];
  if (values.placement !== "top") attrs.push(`placement="${values.placement}"`);
  attrs.push(`render={<Button variant="secondary">${values.trigger || "Share"}</Button>}`);
  return `<Tooltip ${attrs.join(" ")} />`;
}

export default function TooltipPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Tooltip
          content={String(values.content)}
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          render={<Button variant="secondary">{String(values.trigger) || "Share"}</Button>}
        />
      )}
    />
  );
}
