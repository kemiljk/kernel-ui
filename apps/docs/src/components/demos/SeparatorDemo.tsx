import { Separator } from "@kernelui/react";

export default function SeparatorDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "100%" }}>
      <p style={{ margin: 0 }}>Above the rule.</p>
      <Separator />
      <p style={{ margin: 0 }}>Below the rule.</p>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", blockSize: "1.5rem" }}>
        <span>Left</span>
        <Separator orientation="vertical" />
        <span>Right</span>
      </div>
    </div>
  );
}
