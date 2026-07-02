import { Button } from "@kernelui/react";

export default function ButtonVariants() {
  return (
    <div className="showcase-item">
      <div className="showcase-row">
        <Button variant="primary">Save</Button>
        <Button variant="secondary">Cancel</Button>
        <Button variant="ghost">Learn more</Button>
      </div>
      <div className="showcase-row">
        <Button variant="danger">Delete</Button>
        <Button variant="danger" size="sm">
          Remove
        </Button>
        <Button variant="ghost" disabled>
          Archive
        </Button>
      </div>
    </div>
  );
}
