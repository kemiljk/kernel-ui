import { AgentActivity, AgentActivityItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "kind",
    label: "kind",
    options: ["trace", "search", "reasoning", "tool"],
    default: "search",
  },
  {
    type: "enum" as const,
    prop: "status",
    label: "status",
    options: ["complete", "pending", "running", "error"],
    default: "complete",
  },
  { type: "text" as const, prop: "label", label: "label", default: "Searched the repo" },
  { type: "boolean" as const, prop: "body", label: "has detail", default: true },
];

const BODY = "Three matches, all in packages/react/src/utils.";

function code(values: PlaygroundValues) {
  return `<AgentActivity>
  <AgentActivityItem kind="${values.kind}" status="${values.status}" label="${values.label}"${
    values.body ? "" : " /"
  }>
${values.body ? `    ${BODY}\n  </AgentActivityItem>` : ""}
</AgentActivity>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-agent-activity>
  <kernel-agent-activity-item kind="${values.kind}" status="${values.status}" label="${values.label}">${
    values.body ? `\n    ${BODY}\n  ` : ""
  }</kernel-agent-activity-item>
</kernel-agent-activity>`;
}

export default function AgentActivityPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <AgentActivity style={{ inlineSize: "min(28rem, 100%)" }}>
          <AgentActivityItem
            kind={values.kind as "reasoning" | "search" | "tool" | "trace"}
            status={values.status as "pending" | "running" | "complete" | "error"}
            label={String(values.label)}
          >
            {values.body ? BODY : undefined}
          </AgentActivityItem>
        </AgentActivity>
      )}
    />
  );
}
