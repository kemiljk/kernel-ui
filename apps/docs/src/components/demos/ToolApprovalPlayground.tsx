import { ToolApproval, type ToolApprovalStatus } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "tool", default: "github.create_issue" },
  {
    type: "enum" as const,
    prop: "status",
    options: ["pending", "approved", "denied"],
    default: "pending",
  },
  { type: "boolean" as const, prop: "alwaysAllow", label: "onAlwaysAllow", default: true },
  {
    type: "text" as const,
    prop: "summary",
    label: "children",
    default: "Open an issue titled “Flaky upload test” in kernel-ui.",
  },
];

function code(values: PlaygroundValues) {
  const attrs = [`tool="${values.tool}"`];
  if (values.status !== "pending") attrs.push(`status="${values.status}"`);
  attrs.push("onApprove={run}", "onDeny={skip}");
  if (values.alwaysAllow) attrs.push("onAlwaysAllow={allowForSession}");
  return `<ToolApproval\n  ${attrs.join("\n  ")}\n>\n  <p>${values.summary}</p>\n</ToolApproval>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`tool="${values.tool}"`];
  if (values.status !== "pending") attrs.push(`status="${values.status}"`);
  if (values.alwaysAllow) attrs.push("always-allow");
  return `<kernel-tool-approval ${attrs.join(" ")}>
  <p>${values.summary}</p>
</kernel-tool-approval>
<script>
  approval.addEventListener("approve", run);
  approval.addEventListener("deny", skip);
</script>`;
}

export default function ToolApprovalPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <div style={{ inlineSize: "min(100%, 30rem)" }}>
          <ToolApproval
            key={String(values.status)}
            tool={String(values.tool)}
            defaultStatus={values.status as ToolApprovalStatus}
            onAlwaysAllow={values.alwaysAllow ? () => {} : undefined}
          >
            <p style={{ margin: 0 }}>{String(values.summary)}</p>
          </ToolApproval>
        </div>
      )}
    />
  );
}
