import { Skeleton } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "number" as const, prop: "width", default: 240, min: 40, max: 480, step: 8 },
  { type: "number" as const, prop: "height", default: 16, min: 8, max: 200, step: 4 },
  { type: "number" as const, prop: "radius", default: 6, min: 0, max: 100, step: 2, label: "border radius" },
];

function code(values: PlaygroundValues) {
  return `<Skeleton style={{ width: ${Number(values.width)}, height: ${Number(
    values.height,
  )}, borderRadius: ${Number(values.radius)} }} />`;
}

export default function SkeletonPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Skeleton
          style={{
            width: Number(values.width),
            height: Number(values.height),
            borderRadius: Number(values.radius),
          }}
        />
      )}
    />
  );
}
