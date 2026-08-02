import { components } from "../../data/components";

const available = components.filter((c) => c.status === "available").length;

/** React's atom mark: a nucleus plus three ellipses at 60° rotations. */
function ReactLogo() {
  return (
    <svg
      className="showcase-platform-icon-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(60 12 12)" />
      <ellipse cx="12" cy="12" rx="10" ry="4.2" transform="rotate(120 12 12)" />
    </svg>
  );
}

/** A custom-element tag mark (`<tag>`) standing in for framework-free
 * Web Components, since there's no single canonical "Elements" logo. */
function ElementsLogo() {
  return (
    <svg
      className="showcase-platform-icon-mark"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 6 3 12l5 6" />
      <path d="M16 6l5 6-5 6" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function PlatformCards() {
  return (
    <div className="showcase-item">
      <h3>Platforms</h3>
      <div className="showcase-row" style={{ alignItems: "stretch" }}>
        <div className="showcase-subcard">
          <span className="showcase-platform-icon" aria-hidden="true">
            <ReactLogo />
          </span>
          <p>
            <strong>React</strong>
          </p>
          <p>{available} components</p>
        </div>
        <div className="showcase-subcard">
          <span className="showcase-platform-icon" aria-hidden="true">
            <ElementsLogo />
          </span>
          <p>
            <strong>Elements</strong>
          </p>
          <p>{available} components</p>
        </div>
      </div>
    </div>
  );
}
