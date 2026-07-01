import { Skeleton } from "@kernelui/react";

export default function SkeletonDemo() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", inlineSize: "100%" }}>
      <Skeleton style={{ inlineSize: "2.5rem", blockSize: "2.5rem", borderRadius: "999px" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", flex: 1 }}>
        <Skeleton style={{ inlineSize: "60%" }} />
        <Skeleton style={{ inlineSize: "85%" }} />
      </div>
    </div>
  );
}
