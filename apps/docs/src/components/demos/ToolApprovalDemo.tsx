import { useState } from "react";
import { Button, CodeBlock, ToolApproval, type ToolApprovalStatus } from "@kernelui-lib/react";

export default function ToolApprovalDemo() {
  const [status, setStatus] = useState<ToolApprovalStatus>("pending");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", inlineSize: "min(100%, 32rem)" }}>
      <ToolApproval
        tool="bash"
        status={status}
        onStatusChange={setStatus}
        onAlwaysAllow={() => {}}
      >
        <p style={{ margin: 0 }}>Run the test suite in the repository root.</p>
        <CodeBlock code="bun run test -- --run" language="sh" />
      </ToolApproval>
      {status !== "pending" ? (
        <Button variant="ghost" size="sm" style={{ alignSelf: "flex-start" }} onClick={() => setStatus("pending")}>
          Ask again
        </Button>
      ) : null}
    </div>
  );
}
