import { Resizable } from "@kernelui-lib/react";

export default function ResizableDemo() {
  return (
    <div style={{ inlineSize: "100%", blockSize: "16rem" }}>
      <Resizable defaultSplit={40}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            blockSize: "100%",
            border: "1px solid var(--kernel-color-border)",
            backgroundColor: "var(--kernel-color-surface)",
            color: "var(--kernel-color-text)",
          }}
        >
          Pane A
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            blockSize: "100%",
            border: "1px solid var(--kernel-color-border)",
            backgroundColor: "var(--kernel-color-surface-raised)",
            color: "var(--kernel-color-text)",
          }}
        >
          Pane B
        </div>
      </Resizable>
    </div>
  );
}
