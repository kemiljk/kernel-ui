import { SchemaRenderer } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { schemaSampleNames, schemaSamples } from "./schemaSamples";

const controls = [
  { type: "enum" as const, prop: "sample", options: schemaSampleNames, default: schemaSampleNames[0]! },
  { type: "boolean" as const, prop: "streaming", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = ["value={tree}"];
  if (values.streaming) attrs.push("streaming");
  attrs.push("onAction={({ action, payload, values }) => handle(action, payload, values)}");
  attrs.push("onIssue={(issue) => log(issue)}");
  return `// ${values.sample}\nconst tree = ${JSON.stringify(schemaSamples[String(values.sample)])};\n\n<SchemaRenderer\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-schema-renderer${values.streaming ? " streaming" : ""}></kernel-schema-renderer>
<script type="module">
  const renderer = document.querySelector("kernel-schema-renderer");
  renderer.value = ${JSON.stringify(schemaSamples[String(values.sample)])};
  renderer.addEventListener("action", (event) => handle(event.detail));
  renderer.addEventListener("issue", (event) => log(event.detail));
</script>`;
}

export default function SchemaRendererPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <div style={{ inlineSize: "min(100%, 28rem)" }}>
          <SchemaRenderer
            value={schemaSamples[String(values.sample)]}
            streaming={Boolean(values.streaming)}
            onIssue={() => {}}
          />
        </div>
      )}
    />
  );
}
