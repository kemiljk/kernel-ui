import { Button } from "@kernelui-lib/react";
import { PACKAGE_VERSION } from "../../lib/site";

export default function UpdateBanner() {
  return (
    <div className="showcase-item">
      <div className="showcase-row-between">
        <div className="showcase-stack">
          <p>
            <strong>v{PACKAGE_VERSION}</strong>
          </p>
          <p>React and Web Components packages, shared design tokens.</p>
        </div>
        <Button variant="secondary" size="sm" render={<a href="/installation/" />}>
          Install
        </Button>
      </div>
    </div>
  );
}
