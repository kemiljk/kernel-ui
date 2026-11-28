import { UsageMeter } from "@kernelui-lib/react";

export default function UsageMeterDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", inlineSize: "min(100%, 26rem)" }}>
      <UsageMeter label="Context window" value={12_340} max={200_000} high={160_000} unit="tokens" />
      <UsageMeter
        label="Monthly credits"
        value={4_350}
        max={5_000}
        low={3_500}
        high={4_750}
        unit="credits"
        description="Resets on the 1st."
      />
      <UsageMeter label="Daily messages" value={50} max={50} high={40} unit="messages" />
    </div>
  );
}
