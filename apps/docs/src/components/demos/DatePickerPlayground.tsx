import { useState } from "react";
import { DatePicker } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "disablePast", label: "disable past dates", default: false },
  { type: "boolean" as const, prop: "disableFuture", label: "disable future dates", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = ["value={date}", "onValueChange={setDate}"];
  if (values.disablePast) attrs.push("minDate={new Date()}");
  if (values.disableFuture) attrs.push("maxDate={new Date()}");
  return `<DatePicker ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const today = new Date().toISOString().slice(0, 10);
  const attrs: string[] = [];
  if (values.disablePast) attrs.push(`min-date="${today}"`);
  if (values.disableFuture) attrs.push(`max-date="${today}"`);
  return `<kernel-date-picker${attrs.length ? ` ${attrs.join(" ")}` : ""}></kernel-date-picker>`;
}

function Stage({ values }: { values: PlaygroundValues }) {
  const [date, setDate] = useState<Date>();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
      <DatePicker
        value={date}
        onValueChange={setDate}
        minDate={values.disablePast ? new Date() : undefined}
        maxDate={values.disableFuture ? new Date() : undefined}
      />
      <p style={{ margin: 0, fontSize: "0.875rem", textAlign: "center" }}>
        Selected: {date ? date.toLocaleDateString() : "none"}
      </p>
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
