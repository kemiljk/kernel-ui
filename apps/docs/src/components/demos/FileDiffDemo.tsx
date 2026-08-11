import { useEffect, useState } from "react";
import { FileDiff, type DiffRow } from "@kernelui-lib/react";

const ROWS: DiffRow[] = [
  { kind: "hunk", content: "@@ -80,7 +80,11 @@ export class StickToBottomController" },
  { kind: "context", oldLine: 80, newLine: 80, content: "  scrollToBottom(behavior = \"instant\") {" },
  { kind: "remove", oldLine: 81, content: "    this.viewport.scrollTo({ top: this.viewport.scrollHeight });" },
  { kind: "add", newLine: 81, content: "    const smooth = behavior === \"smooth\" && !prefersReducedMotion();" },
  { kind: "add", newLine: 82, content: "    if (smooth) {" },
  { kind: "add", newLine: 83, content: "      this.viewport.scrollTo({ top: this.viewport.scrollHeight, behavior: \"smooth\" });" },
  { kind: "add", newLine: 84, content: "    } else {" },
  { kind: "add", newLine: 85, content: "      this.viewport.scrollTop = this.viewport.scrollHeight;" },
  { kind: "add", newLine: 86, content: "    }" },
  { kind: "context", oldLine: 82, newLine: 87, content: "  }" },
];

/** Streams rows in so the counts are seen ticking up and the rows landing. */
export default function FileDiffDemo() {
  const [count, setCount] = useState(2);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCount((current) => (current >= ROWS.length ? 2 : current + 1));
    }, 700);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <FileDiff
      path="packages/react/src/utils/stickToBottom.ts"
      rows={ROWS.slice(0, count)}
      streaming={count < ROWS.length}
      style={{ inlineSize: "min(38rem, 100%)" }}
    />
  );
}
