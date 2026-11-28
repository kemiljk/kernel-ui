import { StreamingMarkdown } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "text" as const,
    prop: "content",
    label: "content",
    default: "Try **bold**, `code`, a [link](https://example.com) or an unclosed **fence of thought",
  },
  { type: "boolean" as const, prop: "streaming", label: "streaming", default: true },
  { type: "boolean" as const, prop: "animate", label: "animate", default: true },
];

function quote(value: string) {
  return JSON.stringify(value);
}

function code(values: PlaygroundValues) {
  return `<StreamingMarkdown
  content={${quote(String(values.content))}}${values.streaming ? "\n  streaming" : ""}${
    values.animate ? "" : "\n  animate={false}"
  }
/>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-streaming-markdown${values.streaming ? " streaming" : ""}${
    values.animate ? "" : " no-animate"
  }></kernel-streaming-markdown>

<script type="module">
  const md = document.querySelector("kernel-streaming-markdown");
  // Append chunks as they arrive; only the last block is patched.
  md.content = ${quote(String(values.content))};
</script>`;
}

export default function StreamingMarkdownPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <StreamingMarkdown
          data-demo="streaming-markdown-playground"
          content={String(values.content)}
          streaming={Boolean(values.streaming)}
          animate={Boolean(values.animate)}
          style={{ inlineSize: "min(34rem, 100%)" }}
        />
      )}
    />
  );
}
