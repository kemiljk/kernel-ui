import { useState } from "react";
import { DateRangePicker } from "@kernelui-lib/react";
import type { DateRange } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "disablePast", label: "disable past dates", default: false },
];

function code(values: PlaygroundValues) {
  return values.disablePast
    ? `<DateRangePicker value={range} onValueChange={setRange} minDate={new Date()} />`
    : `<DateRangePicker value={range} onValueChange={setRange} />`;
}

function elementsCode(values: PlaygroundValues) {
  return values.disablePast
    ? `<kernel-date-range-picker min-date="${new Date().toISOString().slice(0, 10)}"></kernel-date-range-picker>`
    : `<kernel-date-range-picker></kernel-date-range-picker>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [range, setRange] = useState<DateRange>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <DateRangePicker value={range} onValueChange={setRange} minDate={values.disablePast ? new Date() : undefined} />
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

export default function DateRangePickerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <Stage values={values} />}
    />
  );
}
