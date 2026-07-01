import { useState } from "react";
import { DatePicker } from "@kernelui/react";

export default function DatePickerDemo() {
  const [date, setDate] = useState<Date>();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "flex-start" }}>
      <DatePicker value={date} onValueChange={setDate} />
      <p style={{ margin: 0, fontSize: "0.875rem" }}>
        Selected: {date ? date.toLocaleDateString() : "none"}
      </p>
    </div>
  );
}
