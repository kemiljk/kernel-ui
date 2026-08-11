import { useEffect, useState } from "react";
import { CodeBlock } from "@kernelui-lib/react";

const SOURCE = `export function useStickToBottom(options = {}) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    const controller = new StickToBottomController(
      viewportRef.current,
      contentRef.current,
      { onPinnedChange: setPinned },
    );
    return () => controller.destroy();
  }, []);

  return { viewportRef, contentRef, pinned };
}`;

const LINES = SOURCE.split("\n");

/** Streams the source a line at a time, so the block is seen following its own
 * last line rather than described as doing so. */
export default function CodeBlockDemo() {
  const [count, setCount] = useState(4);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount((current) => (current >= LINES.length ? 4 : current + 1));
    }, 400);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <CodeBlock
      label="packages/react/src/utils/stickToBottom.ts"
      language="ts"
      code={LINES.slice(0, count).join("\n")}
      showLineNumbers
      highlightLines={[7]}
      streaming={count < LINES.length}
      maxBlockSize="12rem"
      style={{ inlineSize: "min(34rem, 100%)" }}
    />
  );
}
