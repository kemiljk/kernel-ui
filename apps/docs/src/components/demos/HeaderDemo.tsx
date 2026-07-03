import { Header } from "@kernelui-lib/react";

export default function HeaderDemo() {
  return (
    <Header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        inlineSize: "100%",
        padding: "var(--kernel-space-4)",
        border: "var(--kernel-border-width) solid var(--kernel-color-border)",
        borderRadius: "var(--kernel-radius-md)",
      }}
    >
      <strong>Acme</strong>
      <span style={{ color: "var(--kernel-color-text-muted)", fontSize: "var(--kernel-font-size-sm)" }}>
        Docs / Components / Header
      </span>
    </Header>
  );
}
