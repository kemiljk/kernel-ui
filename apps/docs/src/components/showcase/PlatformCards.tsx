import { Avatar } from "@kernelui/react";

export default function PlatformCards() {
  return (
    <div className="showcase-item">
      <h3>Platforms</h3>
      {/* No outer showcase-card here: the two platform cards below ARE
          the card elements — a bordered box wrapping another two bordered
          boxes read as card-in-a-card, and the heading floats directly
          above them, same as a real page would lay this out. */}
      <div className="showcase-row" style={{ alignItems: "stretch" }}>
        <div className="showcase-subcard">
          <Avatar fallback="RE" />
          <p>
            <strong>React</strong>
          </p>
          <p>43 components</p>
        </div>
        <div className="showcase-subcard">
          <Avatar fallback="EL" />
          <p>
            <strong>Elements</strong>
          </p>
          <p>Framework-agnostic</p>
        </div>
      </div>
    </div>
  );
}
