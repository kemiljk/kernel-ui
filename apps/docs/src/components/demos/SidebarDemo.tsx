import { Sidebar } from "@kernelui-lib/react";

export default function SidebarDemo() {
  return (
    <Sidebar
      aria-label="Table of contents"
      style={{
        inlineSize: "16rem",
        padding: "var(--kernel-space-4)",
        border: "var(--kernel-border-width) solid var(--kernel-color-border)",
        borderRadius: "var(--kernel-radius-md)",
      }}
    >
      <strong style={{ display: "block", marginBlockEnd: "var(--kernel-space-2)" }}>
        On this page
      </strong>
      <ul style={{ margin: 0, paddingInlineStart: "var(--kernel-space-4)", color: "var(--kernel-color-text-muted)", fontSize: "var(--kernel-font-size-sm)" }}>
        <li>Installation</li>
        <li>Usage</li>
        <li>Props</li>
        <li>Accessibility</li>
      </ul>
    </Sidebar>
  );
}
