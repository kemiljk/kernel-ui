import { Button, EmptyState } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { InboxIcon } from "./EmptyStateDemo";

const controls = [
  { type: "text" as const, prop: "title", default: "No results" },
  {
    type: "text" as const,
    prop: "description",
    default: "Try a different search, or clear the filters.",
  },
  { type: "enum" as const, prop: "headingLevel", options: ["2", "3", "4"], default: "3" },
  { type: "enum" as const, prop: "variant", options: ["dashed", "plain"], default: "dashed" },
  { type: "boolean" as const, prop: "icon", default: true },
  { type: "boolean" as const, prop: "actions", default: true },
];

function code(values: PlaygroundValues) {
  const attrs = [`title="${values.title}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.headingLevel !== "3") attrs.push(`headingLevel={${values.headingLevel}}`);
  if (values.variant !== "dashed") attrs.push(`variant="${values.variant}"`);
  if (values.icon) attrs.push("icon={<SearchIcon />}");
  if (values.actions) attrs.push('actions={<Button>Clear filters</Button>}');
  return `<EmptyState\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`heading="${values.title}"`];
  if (values.description) attrs.push(`description="${values.description}"`);
  if (values.headingLevel !== "3") attrs.push(`heading-level="${values.headingLevel}"`);
  if (values.variant !== "dashed") attrs.push(`variant="${values.variant}"`);
  const children = [
    values.icon ? '  <svg slot="icon" …></svg>' : null,
    values.actions ? '  <kernel-button slot="actions">Clear filters</kernel-button>' : null,
  ].filter(Boolean);
  return `<kernel-empty-state ${attrs.join(" ")}>${children.length ? `\n${children.join("\n")}\n` : ""}</kernel-empty-state>`;
}

export default function EmptyStatePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <EmptyState
          style={{ inlineSize: "min(100%, 26rem)" }}
          title={String(values.title)}
          description={values.description ? String(values.description) : undefined}
          headingLevel={Number(values.headingLevel) as 2 | 3 | 4}
          variant={values.variant as "dashed" | "plain"}
          icon={values.icon ? <InboxIcon /> : undefined}
          actions={values.actions ? <Button>Clear filters</Button> : undefined}
        />
      )}
    />
  );
}
