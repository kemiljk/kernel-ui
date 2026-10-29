import { Slider } from "@kernelui-lib/react";

export default function SliderDemo() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--kernel-space-6)",
        inlineSize: "100%",
        maxInlineSize: "20rem",
      }}
    >
      <Slider label="Volume" defaultValue={40} showValue />
      <Slider
        label="Effort"
        variant="inset"
        startLabel="Low"
        endLabel="High"
        defaultValue={60}
      />
    </div>
  );
}
