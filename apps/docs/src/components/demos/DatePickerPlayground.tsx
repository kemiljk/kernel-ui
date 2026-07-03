import { useState } from "react";
import { DatePicker } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "disablePast", label: "disable past dates", default: false },
];

function code(values: PlaygroundValues) {
  return values.disablePast
    ? `<DatePicker value={date} onValueChange={setDate} minDate={new Date()} />`
    : `<DatePicker value={date} onValueChange={setDate} />`;
}

function elementsCode(values: PlaygroundValues) {
  return values.disablePast
    ? `<kernel-date-picker min-date="${new Date().toISOString().slice(0, 10)}"></kernel-date-picker>`
    : `<kernel-date-picker></kernel-date-picker>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [date, setDate] = useState<Date>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <DatePicker value={date} onValueChange={setDate} minDate={values.disablePast ? new Date() : undefined} />
      <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center" }}>Selected: {date ? date.toLocaleDateString() : "none"}</p>
    </div>
  );
}

export default function DatePickerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => <Stage values={values} />}
    />
  );
}
