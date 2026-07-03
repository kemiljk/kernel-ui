import { Button } from "@kernelui-lib/react";

export default function UnsavedChangesCard() {
  return (
    <div className="showcase-card">
      <h3>You have unsaved edits</h3>
      <p>Save before you switch pages, or discard them now.</p>
      <div className="showcase-row">
        <Button variant="secondary">Discard</Button>
        <Button variant="primary">Save changes</Button>
      </div>
    </div>
  );
}
