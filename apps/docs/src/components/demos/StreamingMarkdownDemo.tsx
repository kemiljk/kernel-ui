import { useEffect, useRef, useState } from "react";
import { Button, StreamingMarkdown } from "@kernelui-lib/react";

const ANSWER = `## Streaming without the flicker

Each chunk re-renders **only the last block**. Paragraphs, tables and code
that already arrived keep their DOM nodes, so a reader can select text
mid-stream and it stays selected.

1. Split the answer into blocks
2. Memoise each block on its own source
   - unchanged source, no re-render
   - the last block patches in place
3. Render unfinished syntax as its *finished* form

\`\`\`ts
const blocks = parseMarkdown(content, { streaming: true });
// blocks[i].raw is the exact source slice for block i
\`\`\`

| Construct | Mid-stream |
| :-- | :-- |
| \`**bold\` | bold so far |
| open fence | open code block |
| \`[text](htt\` | the text, no link yet |

> Links stay safe: only \`http\`, \`https\`, \`mailto\` and relative
> destinations become links. Read more in the [docs](/components/streaming-markdown/).`;

/** Deterministic chunk sizes, so the stream looks like a model's (uneven
 * bursts of a few characters to a few words) and replays identically. */
function chunks(text: string): string[] {
  const sizes = [3, 7, 2, 11, 5, 4, 9, 6, 1, 8];
  const out: string[] = [];
  let index = 0;
  let step = 0;
  while (index < text.length) {
    const size = sizes[step++ % sizes.length]!;
    out.push(text.slice(index, index + size));
    index += size;
  }
  return out;
}

const CHUNKS = chunks(ANSWER);

/** Streams a canned answer into StreamingMarkdown so the stability is seen,
 * not described: watch earlier blocks stay put while the last one grows. */
export default function StreamingMarkdownDemo() {
  const [count, setCount] = useState(0);
  const [run, setRun] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    setCount(0);
    timer.current = window.setInterval(() => {
      setCount((current) => {
        if (current >= CHUNKS.length) {
          window.clearInterval(timer.current);
          return current;
        }
        return current + 1;
      });
    }, 40);
    return () => window.clearInterval(timer.current);
  }, [run]);

  const streaming = count < CHUNKS.length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem", inlineSize: "min(38rem, 100%)" }}>
      <StreamingMarkdown
        data-demo="streaming-markdown"
        content={CHUNKS.slice(0, count).join("")}
        streaming={streaming}
        style={{ minBlockSize: "34rem" }}
      />
      <div>
        <Button size="sm" variant="secondary" onClick={() => setRun((n) => n + 1)} disabled={streaming}>
          Replay
        </Button>
      </div>
    </div>
  );
}
