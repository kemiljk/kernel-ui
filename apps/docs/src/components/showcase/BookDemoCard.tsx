import { useState } from "react";
import { Button, DatePicker } from "@kernelui-lib/react";

export default function BookDemoCard() {
  const [date, setDate] = useState<Date>();

  return (
    <div className="showcase-item">
      <h3>Talk to us</h3>
      <p>Pick a time that works for your team.</p>
      <div className="showcase-stack">
        <DatePicker value={date} onValueChange={setDate} />
        <Button variant="primary">Schedule call</Button>
      </div>
    </div>
  );
}
