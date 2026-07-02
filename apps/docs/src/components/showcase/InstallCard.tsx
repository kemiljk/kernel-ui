import { Button } from "@kernelui/react";

export default function InstallCard() {
  return (
    <div className="showcase-card">
      <h3>Get started</h3>
      <p>One package, every platform.</p>
      <div className="showcase-stack">
        <pre style={{ margin: 0 }}>
          <code
            style={{
              display: "block",
              fontFamily: "var(--kernel-font-mono)",
              fontSize: "var(--kernel-font-size-sm)",
              backgroundColor: "var(--kernel-color-canvas)",
              padding: "var(--kernel-space-2) var(--kernel-space-3)",
              borderRadius: "var(--kernel-radius-sm)",
            }}
          >
            npm install @kernelui/react
          </code>
        </pre>
        <Button variant="primary" style={{ width: "100%" }}>
          Read the docs
        </Button>
        <Button variant="secondary" style={{ width: "100%" }}>
          View on GitHub
        </Button>
      </div>
    </div>
  );
}
