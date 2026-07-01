import { Avatar, HoverCard } from "@kernelui/react";

export default function HoverCardDemo() {
  return (
    <HoverCard
      render={<a href="https://github.com/karlkoch">@karlkoch</a>}
      content={
        <div style={{ display: "flex", gap: "var(--kernel-space-3)", alignItems: "flex-start" }}>
          <Avatar fallback="KK" />
          <div>
            <div style={{ fontWeight: 600 }}>Karl Koch</div>
            <div style={{ color: "var(--kernel-color-text-muted)" }}>
              Designs and builds Kernel UI.
            </div>
          </div>
        </div>
      }
    />
  );
}
