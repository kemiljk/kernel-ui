import { useState } from "react";
import { Checkbox } from "@kernelui/react";

export default function CheckboxDemo() {
  const [values, setValues] = useState([true, false, false]);
  const allChecked = values.every(Boolean);
  const someChecked = values.some(Boolean);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
      <Checkbox
        checked={allChecked}
        indeterminate={someChecked && !allChecked}
        onCheckedChange={(checked) => setValues(values.map(() => checked))}
      >
        Select all
      </Checkbox>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingInlineStart: "1.5rem" }}>
        {values.map((checked, index) => (
          <Checkbox
            key={index}
            checked={checked}
            onCheckedChange={(next) =>
              setValues(values.map((v, i) => (i === index ? next : v)))
            }
          >
            Item {index + 1}
          </Checkbox>
        ))}
      </div>
      <Checkbox disabled>Disabled</Checkbox>
    </div>
  );
}
