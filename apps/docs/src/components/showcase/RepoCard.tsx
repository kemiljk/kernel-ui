import { Badge } from "@kernelui/react";

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
          <strong>2.1K</strong> Stars
        </p>
        <p>
          <strong>43</strong> Components
        </p>
        <p>
          <strong>0</strong> Dependencies
        </p>
      </div>
    </div>
  );
}
