import { useState } from "react";
import { DateRangePicker } from "@kernelui-lib/react";
import type { DateRange } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "disablePast", label: "disable past dates", default: false },
  { type: "boolean" as const, prop: "disableFuture", label: "disable future dates", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = ["value={range}", "onValueChange={setRange}"];
  if (values.disablePast) attrs.push("minDate={new Date()}");
  if (values.disableFuture) attrs.push("maxDate={new Date()}");
  return `<DateRangePicker ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const today = new Date().toISOString().slice(0, 10);
  const attrs: string[] = [];
  if (values.disablePast) attrs.push(`min-date="${today}"`);
  if (values.disableFuture) attrs.push(`max-date="${today}"`);
  return `<kernel-date-range-picker${attrs.length ? ` ${attrs.join(" ")}` : ""}></kernel-date-range-picker>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [range, setRange] = useState<DateRange>({});
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <DateRangePicker
        value={range}
        onValueChange={setRange}
        minDate={values.disablePast ? new Date() : undefined}
        maxDate={values.disableFuture ? new Date() : undefined}
      />
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
