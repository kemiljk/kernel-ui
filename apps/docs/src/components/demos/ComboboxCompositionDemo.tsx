import { useState } from "react";
import { Combobox } from "@kernelui-lib/react";

const groups = [
  { id: "frontend", label: "Frontend", items: [{ value: "astro", label: "Astro" }, { value: "react", label: "React" }] },
  { id: "backend", label: "Backend", items: [{ value: "bun", label: "Bun" }, { value: "node", label: "Node.js" }] },
];

export default function ComboboxCompositionDemo() {
  const [value, setValue] = useState("");

  return (
    <div style={{ maxInlineSize: "22rem" }}>
      <Combobox label="Framework">
        <Combobox.Input value={value} onValueChange={setValue} placeholder="Search frameworks" />
        <Combobox.List>
          {groups.map((group) => (
            <Combobox.Group key={group.id} id={group.id} heading={group.label}>
              {group.items.map((option) => (
                <Combobox.Item key={option.value} id={`framework-${option.value}`} value={option.value} onSelect={() => setValue(option.label)}>
                  {({ active, selected }) => (
                    <span style={{ display: "flex", justifyContent: "space-between", fontWeight: active ? 650 : undefined }}>
                      {option.label}
                      {selected ? <span aria-hidden="true">Selected</span> : null}
                    </span>
                  )}
                </Combobox.Item>
              ))}
            </Combobox.Group>
          ))}
        </Combobox.List>
      </Combobox>
    </div>
  );
}
