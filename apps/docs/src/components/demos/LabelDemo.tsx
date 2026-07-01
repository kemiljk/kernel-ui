import { Label } from "@kernelui/react";

export default function LabelDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Label htmlFor="demo-volume">Volume</Label>
      <input id="demo-volume" type="range" />
      <Label htmlFor="demo-name" required>
        Full name
      </Label>
      <input id="demo-name" type="text" />
    </div>
  );
}
