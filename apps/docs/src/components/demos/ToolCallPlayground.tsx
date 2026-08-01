import { Source, Sources, ToolCall } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "status",
    options: ["pending", "running", "complete", "error"],
    default: "complete",
  },
  {
    type: "text" as const,
    prop: "label",
    default: 'Searched "JWT auth vulnerabilities"',
  },
  { type: "boolean" as const, prop: "defaultOpen", default: true },
  { type: "boolean" as const, prop: "withResults", label: "results", default: true },
];

function code(values: PlaygroundValues) {
  const attrs = [`label="${values.label}"`, `status="${values.status}"`];
  if (values.defaultOpen) attrs.push("defaultOpen");
  if (!values.withResults) {
    return `<ToolCall ${attrs.join(" ")} />`;
  }
  return `<ToolCall ${attrs.join(" ")}>
  <Sources heading={null}>
    <Source title="JWT verification best practices" href="…" />
  </Sources>
</ToolCall>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`label="${values.label}"`, `status="${values.status}"`];
  if (values.defaultOpen) attrs.push("default-open");
  if (!values.withResults) {
    return `<kernel-tool-call ${attrs.join(" ")}></kernel-tool-call>`;
  }
  return `<kernel-tool-call ${attrs.join(" ")}>
  <kernel-sources heading="">
    <kernel-source title="JWT verification best practices" href="…"></kernel-source>
  </kernel-sources>
</kernel-tool-call>`;
}

export default function ToolCallPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <ToolCall
          key={`${values.status}-${values.withResults}-${values.defaultOpen}`}
          label={String(values.label)}
          status={values.status as "pending" | "running" | "complete" | "error"}
          defaultOpen={Boolean(values.defaultOpen)}
        >
          {values.withResults ? (
            <Sources heading={null}>
              <Source
                title="JWT verification best practices"
                href="https://auth0.com/blog/jwt-security-best-practices"
              />
              <Source
                title="Node.js authentication security guide"
                href="https://owasp.org/www-project-nodejs-goat"
              />
            </Sources>
          ) : undefined}
        </ToolCall>
      )}
    />
  );
}
