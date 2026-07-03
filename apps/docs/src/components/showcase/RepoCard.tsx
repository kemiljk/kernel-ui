import { Badge } from "@kernelui-lib/react";
import { components } from "../../data/components";

const available = components.filter((c) => c.status === "available").length;

export default function RepoCard() {
  return (
    <div className="showcase-item">
      <div className="showcase-row">
        <h3>kernel-ui</h3>
        <Badge variant="accent">MIT</Badge>
      </div>
      <p>The actual kernel of the web, componentised.</p>
      <div className="showcase-row">
        <p>
          <strong>Open source</strong>
        </p>
        <p>
          <strong>{available}</strong> Components
        </p>
        <p>
          <strong>0</strong> Runtime deps
        </p>
      </div>
    </div>
  );
}
