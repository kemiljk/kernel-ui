import { Select, SelectOption } from "@kernelui-lib/react";

export default function SelectDemo() {
  return (
    <Select label="Country" defaultValue="uk" style={{ minInlineSize: "14rem" }}>
      <SelectOption value="uk">United Kingdom</SelectOption>
      <SelectOption value="us">United States</SelectOption>
      <SelectOption value="de">Germany</SelectOption>
      <SelectOption value="jp">Japan</SelectOption>
    </Select>
  );
}
