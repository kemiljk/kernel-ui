import { Avatar, HoverCard } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  { type: "number" as const, prop: "openDelay", label: "openDelay (ms)", default: 400, min: 0, max: 1000, step: 50 },
  { type: "number" as const, prop: "closeDelay", label: "closeDelay (ms)", default: 200, min: 0, max: 1000, step: 50 },
  { type: "text" as const, prop: "trigger", label: "trigger label", default: "@karlkoch" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  if (Number(values.openDelay) !== 400) attrs.push(`openDelay={${Number(values.openDelay)}}`);
  if (Number(values.closeDelay) !== 200) attrs.push(`closeDelay={${Number(values.closeDelay)}}`);
  attrs.push(`render={<a href="https://github.com/karlkoch">${values.trigger || "@karlkoch"}</a>}`);
  return `<HoverCard
  ${attrs.join("\n  ")}
  content={/* Avatar + name + bio */}
/>`;
}

export default function HoverCardPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <HoverCard
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          openDelay={Number(values.openDelay)}
          closeDelay={Number(values.closeDelay)}
          render={<a href="https://github.com/karlkoch">{String(values.trigger) || "@karlkoch"}</a>}
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
