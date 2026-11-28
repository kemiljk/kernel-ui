import { Kbd } from "@kernelui-lib/react";

const SHORTCUTS: { action: string; keys: string[] }[] = [
  { action: "Open command palette", keys: ["mod", "K"] },
  { action: "New chat", keys: ["mod", "shift", "O"] },
  { action: "Send message", keys: ["mod", "↵"] },
  { action: "Stop generating", keys: ["Esc"] },
];

export default function KbdDemo() {
  return (
    <dl
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "center",
        gap: "0.75rem 2rem",
        margin: 0,
        inlineSize: "min(100%, 22rem)",
      }}
    >
      {SHORTCUTS.map((shortcut) => (
        <div key={shortcut.action} style={{ display: "contents" }}>
          <dt style={{ color: "var(--kernel-color-text-muted)" }}>{shortcut.action}</dt>
          <dd style={{ margin: 0, justifySelf: "end" }}>
            <Kbd keys={shortcut.keys} />
          </dd>
        </div>
      ))}
    </dl>
  );
}
