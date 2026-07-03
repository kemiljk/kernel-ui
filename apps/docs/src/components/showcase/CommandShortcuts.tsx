import { Separator } from "@kernelui-lib/react";

export default function CommandShortcuts() {
  return (
    <div className="showcase-card">
      <h3>Shortcuts</h3>
      <div className="showcase-stack">
        <div className="showcase-row-between">
          <div>
            <p>Search components</p>
            <p>Jump to any component or page</p>
          </div>
          <kbd className="showcase-kbd">⌘K</kbd>
        </div>
        <Separator />
        <div className="showcase-row-between">
          <div>
            <p>Toggle theme</p>
            <p>Switch between light and dark</p>
          </div>
          <kbd className="showcase-kbd">⌘J</kbd>
        </div>
        <Separator />
        <div className="showcase-row-between">
          <div>
            <p>Copy markdown</p>
            <p>Copy this page as markdown</p>
          </div>
          <kbd className="showcase-kbd">⌘⇧C</kbd>
        </div>
      </div>
    </div>
  );
}
