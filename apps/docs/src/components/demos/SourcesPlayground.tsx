import { Source, Sources } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "heading", default: "Sources" },
  { type: "boolean" as const, prop: "showIndex", label: "index", default: true },
];

function code(values: PlaygroundValues) {
  const heading =
    values.heading === "Sources"
      ? ""
      : values.heading === ""
        ? " heading={null}"
        : ` heading="${values.heading}"`;
  const index = values.showIndex ? "\n    index={1}" : "";
  return `<Sources${heading}>
  <Source${index}
    title="Attention Is All You Need"
    href="https://arxiv.org/abs/1706.03762"
  />
</Sources>`;
}

function elementsCode(values: PlaygroundValues) {
  const heading =
    values.heading === "Sources"
      ? ""
      : ` heading="${values.heading}"`;
  const index = values.showIndex ? ' index="1"' : "";
  return `<kernel-sources${heading}>
  <kernel-source${index}
    title="Attention Is All You Need"
    href="https://arxiv.org/abs/1706.03762"
  ></kernel-source>
</kernel-sources>`;
}

export default function SourcesPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <Sources heading={values.heading === "" ? null : String(values.heading)}>
          <Source
            index={values.showIndex ? 1 : undefined}
            title="Attention Is All You Need"
            href="https://arxiv.org/abs/1706.03762"
          />
          <Source
            index={values.showIndex ? 2 : undefined}
            title="Efficient Transformers: A Survey"
            href="https://arxiv.org/abs/2009.06732"
          />
        </Sources>
      )}
    />
  );
}
