import { Toggle } from "@kernelui-lib/react";

export default function ToggleDemo() {
  return (
    <>
      <Toggle aria-label="Bold" defaultPressed>
        <strong>B</strong>
      </Toggle>
      <Toggle aria-label="Italic">
        <em>I</em>
      </Toggle>
      <Toggle aria-label="Underline">
        <span style={{ textDecoration: "underline" }}>U</span>
      </Toggle>
    </>
  );
}
