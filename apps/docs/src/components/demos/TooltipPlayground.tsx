import { Button, Tooltip } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "content", default: "Copies the current URL" },
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "top",
  },
  {
    type: "enum" as const,
    prop: "align",
    options: ["start", "center", "end"],
    default: "center",
  },
  { type: "number" as const, prop: "offset", label: "offset (px)", default: 8, min: 0, max: 32, step: 1 },
  { type: "number" as const, prop: "openDelay", label: "openDelay (ms)", default: 0, min: 0, max: 1000, step: 50 },
  { type: "number" as const, prop: "closeDelay", label: "closeDelay (ms)", default: 0, min: 0, max: 1000, step: 50 },
  { type: "boolean" as const, prop: "arrow", default: false },
  { type: "text" as const, prop: "trigger", label: "trigger label", default: "Share" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`content="${values.content}"`];
  if (values.placement !== "top") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset={${Number(values.offset)}}`);
  if (Number(values.openDelay) !== 0) attrs.push(`openDelay={${Number(values.openDelay)}}`);
  if (Number(values.closeDelay) !== 0) attrs.push(`closeDelay={${Number(values.closeDelay)}}`);
  if (values.arrow) attrs.push("arrow");
  attrs.push(`render={<Button variant="secondary">${values.trigger || "Share"}</Button>}`);
  return `<Tooltip ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "top") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset="${Number(values.offset)}"`);
  if (Number(values.openDelay) !== 0) attrs.push(`open-delay="${Number(values.openDelay)}"`);
  if (Number(values.closeDelay) !== 0) attrs.push(`close-delay="${Number(values.closeDelay)}"`);
  if (values.arrow) attrs.push("arrow");
  const attrString = attrs.length > 0 ? ` ${attrs.join(" ")}` : "";
  return `<kernel-tooltip${attrString}>
  <button slot="trigger" type="button">${values.trigger || "Share"}</button>
  ${values.content}
</kernel-tooltip>`;
}

export default function TooltipPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Tooltip
          content={String(values.content)}
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          align={values.align as "start" | "center" | "end"}
          offset={Number(values.offset)}
          openDelay={Number(values.openDelay)}
          closeDelay={Number(values.closeDelay)}
          arrow={Boolean(values.arrow)}
          render={<Button variant="secondary">{String(values.trigger) || "Share"}</Button>}
        />
      )}
    />
  );
}
