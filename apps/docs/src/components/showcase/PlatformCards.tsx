import { Avatar } from "@kernelui-lib/react";
import { components } from "../../data/components";

const available = components.filter((c) => c.status === "available").length;

export default function PlatformCards() {
  return (
    <div className="showcase-item">
      <h3>Platforms</h3>
      <div className="showcase-row" style={{ alignItems: "stretch" }}>
        <div className="showcase-subcard">
          <Avatar fallback="RE" />
          <p>
            <strong>React</strong>
          </p>
          <p>{available} components</p>
        </div>
        <div className="showcase-subcard">
          <Avatar fallback="EL" />
          <p>
            <strong>Elements</strong>
          </p>
          <p>{available} components</p>
        </div>
      </div>
    </div>
  );
}
