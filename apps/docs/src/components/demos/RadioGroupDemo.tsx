import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@kernelui/react";

export default function RadioGroupDemo() {
  const [plan, setPlan] = useState("pro");

  return (
    <RadioGroup label="Plan" value={plan} onValueChange={setPlan}>
      <RadioGroupItem value="free">Free</RadioGroupItem>
      <RadioGroupItem value="pro">Pro</RadioGroupItem>
      <RadioGroupItem value="team">Team</RadioGroupItem>
    </RadioGroup>
  );
}
