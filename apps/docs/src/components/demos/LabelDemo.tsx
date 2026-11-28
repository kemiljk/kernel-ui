import { Label, Switch } from "@kernelui-lib/react";

/* Label is for controls that don't build their own label. Switch is one: it
   renders a real <button role="switch">, a labelable element, and takes no
   label of its own when it has no children — so a standalone Label pointed
   at it with htmlFor names it, and clicking the label toggles it. */
const row = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "var(--kernel-space-4)",
  maxInlineSize: "20rem",
} as const;

export default function LabelDemo() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--kernel-space-3)" }}>
      <div style={row}>
        <Label htmlFor="demo-label-notifications">Email notifications</Label>
        <Switch id="demo-label-notifications" defaultChecked />
      </div>
      <div style={row}>
        <Label htmlFor="demo-label-terms" required>
          Accept the terms
        </Label>
        <Switch id="demo-label-terms" />
      </div>
    </div>
  );
}
