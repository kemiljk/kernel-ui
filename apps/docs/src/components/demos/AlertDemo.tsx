import { Alert } from "@kernelui/react";

export default function AlertDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "100%" }}>
      <Alert variant="info" title="Heads up">
        This is announced politely (role="status"), it won't interrupt anything in progress.
      </Alert>
      <Alert variant="danger" title="Something went wrong">
        This is announced immediately (role="alert").
      </Alert>
    </div>
  );
}
