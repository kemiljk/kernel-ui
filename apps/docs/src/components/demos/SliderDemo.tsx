import { Slider } from "@kernelui-lib/react";

export default function SliderDemo() {
  return (
    <div style={{ inlineSize: "100%", maxInlineSize: "20rem" }}>
      <Slider label="Volume" defaultValue={40} showValue />
    </div>
  );
}
