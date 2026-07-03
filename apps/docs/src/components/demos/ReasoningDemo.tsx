import { useEffect, useState } from "react";
import { Reasoning } from "@kernelui-lib/react";

export default function ReasoningDemo() {
  const [streaming, setStreaming] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setStreaming(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Reasoning streaming={streaming} durationLabel="Thought for 2s">
      Checking the request against the available components, then narrowing
      down to the ones that already support a streaming/thinking state.
    </Reasoning>
  );
}
