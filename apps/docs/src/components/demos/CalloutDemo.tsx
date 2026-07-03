import { Callout } from "@kernelui-lib/react";

export default function CalloutDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "100%" }}>
      <Callout variant="info" title="Heads up">
        This is announced politely (role="status"), it won't interrupt anything in progress.
      </Callout>
      <Callout variant="danger" title="Something went wrong">
        This is announced immediately (role="alert").
      </Callout>
    </div>
  );
}
