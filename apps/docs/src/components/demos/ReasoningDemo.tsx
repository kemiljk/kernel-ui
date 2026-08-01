import { useEffect, useState } from "react";
import { Reasoning } from "@kernelui-lib/react";

const STEPS = [
  "Reading the request and locating the relevant auth middleware.",
  "Checking whether the verify call pins an algorithms allowlist.",
  "Tracing where the signing secret is loaded from.",
  "Drafting a focused regression test for tampered tokens.",
];

export default function ReasoningDemo() {
  const [streaming, setStreaming] = useState(true);
  const [revealed, setRevealed] = useState(1);

  useEffect(() => {
    const timers: number[] = [];
    STEPS.forEach((_, index) => {
      if (index === 0) return;
      timers.push(window.setTimeout(() => setRevealed(index + 1), index * 700));
    });
    timers.push(
      window.setTimeout(() => {
        setRevealed(STEPS.length);
        setStreaming(false);
      }, STEPS.length * 700 + 400),
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <Reasoning streaming={streaming} durationLabel="Thought for 3s">
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {STEPS.slice(0, revealed).map((step) => (
          <p key={step} style={{ margin: 0 }}>
            {step}
          </p>
        ))}
      </div>
    </Reasoning>
  );
}
