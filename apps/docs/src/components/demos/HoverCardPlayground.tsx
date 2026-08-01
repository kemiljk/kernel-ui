import { Avatar, HoverCard } from "@kernelui-lib/react";
import { GITHUB_URL } from "../../lib/site";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  {
    type: "enum" as const,
    prop: "align",
    options: ["start", "center", "end"],
    default: "center",
  },
  { type: "number" as const, prop: "offset", label: "offset (px)", default: 8, min: 0, max: 32, step: 1 },
  { type: "number" as const, prop: "openDelay", label: "openDelay (ms)", default: 150, min: 0, max: 1000, step: 50 },
  { type: "number" as const, prop: "closeDelay", label: "closeDelay (ms)", default: 100, min: 0, max: 1000, step: 50 },
  { type: "text" as const, prop: "trigger", label: "trigger label", default: "kernel-ui" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset={${Number(values.offset)}}`);
  if (Number(values.openDelay) !== 150) attrs.push(`openDelay={${Number(values.openDelay)}}`);
  if (Number(values.closeDelay) !== 100) attrs.push(`closeDelay={${Number(values.closeDelay)}}`);
  attrs.push(`render={<a href="${GITHUB_URL}">${values.trigger || "kernel-ui"}</a>}`);
  return `<HoverCard
  ${attrs.join("\n  ")}
  content={/* Avatar + name + bio */}
/>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (values.align !== "center") attrs.push(`align="${values.align}"`);
  if (Number(values.offset) !== 8) attrs.push(`offset="${Number(values.offset)}"`);
  if (Number(values.openDelay) !== 150) attrs.push(`open-delay="${Number(values.openDelay)}"`);
  if (Number(values.closeDelay) !== 100) attrs.push(`close-delay="${Number(values.closeDelay)}"`);
  return `<kernel-hover-card${attrs.length ? " " + attrs.join(" ") : ""}>
  <a slot="trigger" href="${GITHUB_URL}">${values.trigger || "kernel-ui"}</a>
  <!-- Avatar + name + bio -->
</kernel-hover-card>`;
}

export default function HoverCardPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <HoverCard
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          align={values.align as "start" | "center" | "end"}
          offset={Number(values.offset)}
          openDelay={Number(values.openDelay)}
          closeDelay={Number(values.closeDelay)}
          render={<a href={GITHUB_URL}>{String(values.trigger) || "kernel-ui"}</a>}
          content={
            <div style={{ display: "flex", gap: "var(--kernel-space-3)", alignItems: "flex-start" }}>
              <Avatar src="/karl-square.png" alt="" fallback="KK" />
              <div>
                <div style={{ fontWeight: 600 }}>Karl Koch</div>
                <div style={{ color: "var(--kernel-color-text-muted)" }}>
                  Designs and builds Kernel UI.
                </div>
              </div>
            </div>
          }
        />
      )}
    />
  );
}
