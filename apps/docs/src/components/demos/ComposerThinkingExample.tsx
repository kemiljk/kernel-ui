import { Composer } from "@kernelui-lib/react";

const EXAMPLE_QUERY = "How do I theme Kernel with a custom accent colour?";

export default function ComposerThinkingExample() {
  return (
    <Composer placeholder="Ask anything…" defaultValue={EXAMPLE_QUERY} thinking />
  );
}

export { EXAMPLE_QUERY };
