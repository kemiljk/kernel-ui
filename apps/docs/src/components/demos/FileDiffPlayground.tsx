import { FileDiff, type DiffRow } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const ROWS: DiffRow[] = [
  { kind: "hunk", content: "@@ -80,3 +80,4 @@" },
  { kind: "context", oldLine: 80, newLine: 80, content: "  scrollToBottom(behavior) {" },
  { kind: "remove", oldLine: 81, content: "    this.viewport.scrollTo({ top: max });" },
  { kind: "add", newLine: 81, content: "    this.viewport.scrollTop = max;" },
  { kind: "context", oldLine: 82, newLine: 82, content: "  }" },
];

const controls = [
  { type: "text" as const, prop: "path", label: "path", default: "src/utils/stickToBottom.ts" },
  { type: "boolean" as const, prop: "showLineNumbers", label: "line numbers", default: true },
  { type: "boolean" as const, prop: "streaming", label: "streaming", default: false },
  { type: "boolean" as const, prop: "collapseOnComplete", label: "collapse on complete", default: false },
];

function code(values: PlaygroundValues) {
  return `<FileDiff
  path="${values.path}"
  showLineNumbers={${values.showLineNumbers}}
  streaming={${values.streaming}}
  collapseOnComplete={${values.collapseOnComplete}}
  rows={[
    { kind: "hunk", content: "@@ -80,3 +80,4 @@" },
    { kind: "context", oldLine: 80, newLine: 80, content: "  scrollToBottom(behavior) {" },
    { kind: "remove", oldLine: 81, content: "    this.viewport.scrollTo({ top: max });" },
    { kind: "add", newLine: 81, content: "    this.viewport.scrollTop = max;" },
  ]}
/>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-file-diff
  id="diff"
  path="${values.path}"${values.showLineNumbers ? "" : "\n  no-line-numbers"}${
    values.streaming ? "\n  streaming" : ""
  }${values.collapseOnComplete ? "\n  collapse-on-complete" : ""}
></kernel-file-diff>

<script type="module">
  document.getElementById("diff").rows = [
    { kind: "hunk", content: "@@ -80,3 +80,4 @@" },
    { kind: "remove", oldLine: 81, content: "    this.viewport.scrollTo({ top: max });" },
    { kind: "add", newLine: 81, content: "    this.viewport.scrollTop = max;" },
  ];
</script>`;
}

export default function FileDiffPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <FileDiff
          path={String(values.path)}
          rows={ROWS}
          showLineNumbers={Boolean(values.showLineNumbers)}
          streaming={Boolean(values.streaming)}
          collapseOnComplete={Boolean(values.collapseOnComplete)}
          style={{ inlineSize: "min(34rem, 100%)" }}
        />
      )}
    />
  );
}
