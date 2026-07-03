import { Button } from "@kernelui-lib/react";
import { GITHUB_URL } from "../../lib/site";

export default function InstallCard() {
  return (
    <div className="showcase-card">
      <h3>Get started</h3>
      <p>One package, every platform.</p>
      <div className="showcase-stack">
        <pre>
          <code>npm install @kernelui-lib/react @kernelui-lib/styles</code>
        </pre>
        <Button variant="primary" render={<a href="/installation/" />}>
          Read the docs
        </Button>
        <Button
          variant="secondary"
          render={<a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" />}
        >
          View on GitHub
        </Button>
      </div>
    </div>
  );
}
