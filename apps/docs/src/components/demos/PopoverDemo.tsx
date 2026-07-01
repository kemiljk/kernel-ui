import { useState } from "react";
import { Button, Popover, RadioGroup, RadioGroupItem } from "@kernelui/react";

/**
 * Distance-from-me is a genuine filter over a list of items — the
 * thing that actually separates Popover (arbitrary interactive
 * content) from Combobox (search + listbox). A single search
 * TextField here would just be a smaller, worse Combobox.
 */
export default function PopoverDemo() {
  const [distance, setDistance] = useState("5");

  return (
    <Popover render={<Button variant="secondary">Distance</Button>}>
      <div style={{ minInlineSize: "14rem" }}>
        <RadioGroup label="Distance from me" value={distance} onValueChange={setDistance}>
          <RadioGroupItem value="1">Within 1 mile</RadioGroupItem>
          <RadioGroupItem value="5">Within 5 miles</RadioGroupItem>
          <RadioGroupItem value="10">Within 10 miles</RadioGroupItem>
          <RadioGroupItem value="any">Any distance</RadioGroupItem>
        </RadioGroup>
      </div>
    </Popover>
  );
}
