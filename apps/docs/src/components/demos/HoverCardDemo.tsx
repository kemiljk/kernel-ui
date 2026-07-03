import { Avatar, HoverCard } from "@kernelui-lib/react";
import { GITHUB_URL } from "../../lib/site";

export default function HoverCardDemo() {
  return (
    <HoverCard
      render={<a href={GITHUB_URL}>kernel-ui</a>}
      content={
        <div style={{ display: "flex", gap: "var(--kernel-space-3)", alignItems: "flex-start" }}>
          <Avatar src="/karl-square.png" alt="" fallback="KK" />
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
