import { Textarea } from "@kernelui/react";

export default function TextareaDemo() {
  return (
    <Textarea
      label="Feedback"
      description="It grows as you type, no JavaScript resize handler."
      placeholder="Tell us what's working, and what isn't…"
      style={{ minInlineSize: "20rem" }}
    />
  );
}
