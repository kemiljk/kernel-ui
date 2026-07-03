import { TagInput } from "@kernelui/react";

export default function TagInputDemo() {
  return (
    <TagInput
      label="Skills"
      defaultValue={["React", "TypeScript"]}
      description="Press Enter or comma to add a tag. Backspace on an empty field removes the last one."
    />
  );
}
