import { Badge } from "@kernelui-lib/react";
import { CheckIcon, ChevronDownIcon, CrossIcon } from "../icons";

export default function BadgeDemo() {
  return (
    <div style={{ display: "grid", gap: "0.75rem", justifyItems: "center" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
        <Badge variant="neutral">Neutral</Badge>
        <Badge variant="accent">New</Badge>
        <Badge variant="success">Shipped</Badge>
        <Badge variant="warning">Beta</Badge>
        <Badge variant="danger">Deprecated</Badge>
      </div>
      {/* Icons go straight in as children: whichever end holds one becomes a
          1lh slot, concentric with the badge's rounded end. */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", justifyContent: "center" }}>
        <Badge variant="success">
          <CheckIcon /> Shipped
        </Badge>
        <Badge variant="neutral">
          Filter <ChevronDownIcon />
        </Badge>
        <Badge variant="danger">
          <CrossIcon role="img" aria-hidden={false} aria-label="Failed" />
        </Badge>
      </div>
    </div>
  );
}
