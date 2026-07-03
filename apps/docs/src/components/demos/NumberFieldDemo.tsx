import { NumberField } from "@kernelui-lib/react";

export default function NumberFieldDemo() {
  return <NumberField label="Quantity" defaultValue={1} min={0} max={10} />;
}
