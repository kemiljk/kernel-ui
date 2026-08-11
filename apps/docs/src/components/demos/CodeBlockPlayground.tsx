import { CodeBlock } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const SOURCE = `const controller = new StickToBottomController(viewport, content, {
  onPinnedChange: (pinned) => setPinned(pinned),
});

// Following the live edge is always instant.
controller.scrollToBottom("instant");`;

const controls = [
  { type: "text" as const, prop: "label", label: "label", default: "stickToBottom.ts" },
  { type: "text" as const, prop: "language", label: "language", default: "ts" },
  { type: "boolean" as const, prop: "showLineNumbers", label: "line numbers", default: true },
  { type: "boolean" as const, prop: "copyable", label: "copyable", default: true },
  { type: "number" as const, prop: "highlight", label: "highlight line", default: 4, min: 0, max: 6, step: 1 },
  { type: "text" as const, prop: "maxBlockSize", label: "max block size", default: "" },
];

function highlightList(values: PlaygroundValues) {
  const line = Number(values.highlight);
  return line > 0 ? [line] : [];
}

function code(values: PlaygroundValues) {
  const highlight = highlightList(values);
  return `<CodeBlock
  label="${values.label}"
  language="${values.language}"
  showLineNumbers={${values.showLineNumbers}}
  copyable={${values.copyable}}${highlight.length ? `\n  highlightLines={[${highlight.join(", ")}]}` : ""}${
    values.maxBlockSize ? `\n  maxBlockSize="${values.maxBlockSize}"` : ""
  }
  // or lines={await codeToTokens(source)} from your highlighter
  code={source}
/>`;
}

function elementsCode(values: PlaygroundValues) {
  const highlight = highlightList(values);
  return `<kernel-code-block
  label="${values.label}"
  language="${values.language}"${values.showLineNumbers ? "\n  show-line-numbers" : ""}${
    values.copyable ? "" : "\n  no-copy"
  }${highlight.length ? `\n  highlight-lines="${highlight.join(",")}"` : ""}${
    values.maxBlockSize ? `\n  max-block-size="${values.maxBlockSize}"` : ""
  }
><pre><code>const a = 1
const b = 2</code></pre></kernel-code-block>

<script type="module">
  // Or hand it tokens from a highlighter:
  document.querySelector("kernel-code-block").lines = [
    { tokens: [{ text: "const", color: "#c678dd" }, { text: " a = 1" }] },
  ];
</script>`;
}

export default function CodeBlockPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <CodeBlock
          label={String(values.label)}
          language={String(values.language)}
          showLineNumbers={Boolean(values.showLineNumbers)}
          copyable={Boolean(values.copyable)}
          highlightLines={highlightList(values)}
          maxBlockSize={String(values.maxBlockSize) || undefined}
          code={SOURCE}
          style={{ inlineSize: "min(32rem, 100%)" }}
        />
      )}
    />
  );
}
