import { useState } from "react";
import { Button, Popover, RadioGroup, RadioGroupItem } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "placement",
    options: ["top", "bottom", "left", "right"],
    default: "bottom",
  },
  { type: "text" as const, prop: "trigger", label: "trigger label", default: "Distance" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.placement !== "bottom") attrs.push(`placement="${values.placement}"`);
  attrs.push(`render={<Button variant="secondary">${values.trigger || "Distance"}</Button>}`);
  return `<Popover ${attrs.join(" ")}>
  <RadioGroup label="Distance from me" value={distance} onValueChange={setDistance}>
    <RadioGroupItem value="1">Within 1 mile</RadioGroupItem>
    <RadioGroupItem value="5">Within 5 miles</RadioGroupItem>
  </RadioGroup>
</Popover>`;
}

export default function PopoverPlayground() {
  const [distance, setDistance] = useState("5");

  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Popover
          placement={values.placement as "top" | "bottom" | "left" | "right"}
          render={<Button variant="secondary">{String(values.trigger) || "Distance"}</Button>}
        >
          <div style={{ minInlineSize: "14rem" }}>
            <RadioGroup label="Distance from me" value={distance} onValueChange={setDistance}>
              <RadioGroupItem value="1">Within 1 mile</RadioGroupItem>
              <RadioGroupItem value="5">Within 5 miles</RadioGroupItem>
              <RadioGroupItem value="10">Within 10 miles</RadioGroupItem>
              <RadioGroupItem value="any">Any distance</RadioGroupItem>
            </RadioGroup>
          </div>
        </Popover>
      )}
    />
  );
}
