import { useState } from "react";
import { DateRangePicker } from "@kernelui-lib/react";
import type { DateRange } from "@kernelui-lib/react";

export default function DateRangePickerDemo() {
  const [range, setRange] = useState<DateRange>({});

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <DateRangePicker value={range} onValueChange={setRange} />
      <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center" }}>
        {range.from
          ? range.to
            ? `${range.from.toLocaleDateString(undefined, { month: "short", day: "numeric" })} – ${range.to.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`
            : range.from.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
          : "No dates selected"}
      </p>
    </div>
  );
}
