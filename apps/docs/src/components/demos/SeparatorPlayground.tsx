import { Separator } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "orientation",
    options: ["horizontal", "vertical"],
    default: "horizontal",
  },
];

function code(values: PlaygroundValues) {
  return values.orientation === "vertical"
    ? `<Separator orientation="vertical" />`
    : `<Separator />`;
}

export default function SeparatorPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <div
          style={{
            display: "flex",
            flexDirection:
              values.orientation === "vertical" ? "row" : "column",
            alignItems: "center",
            gap: "0.75rem",
            minHeight: values.orientation === "vertical" ? "2rem" : undefined,
            width: "12rem",
          }}
        >
          <span>Before</span>
          <Separator
            orientation={values.orientation as "horizontal" | "vertical"}
          />
          <span>After</span>
        </div>
      )}
    />
  );
}
