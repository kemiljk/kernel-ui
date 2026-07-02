import { Button } from "@kernelui/react";

export default function UpdateBanner() {
  return (
    <div className="showcase-item">
      <div className="showcase-row-between">
        <div className="showcase-stack">
          <p>
            <strong>v2.4 is out</strong>
          </p>
          <p>New Combobox and DateRangePicker components.</p>
        </div>
        <Button variant="secondary" size="sm">
          Update
        </Button>
      </div>
    </div>
  );
}
