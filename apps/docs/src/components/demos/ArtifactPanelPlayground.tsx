import { useEffect, useState } from "react";
import { ArtifactPanel, Button, type ArtifactPanelStatus } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "title", default: "quarterly-report.md" },
  { type: "enum" as const, prop: "presentation", options: ["docked", "overlay", "auto"], default: "docked" },
  { type: "enum" as const, prop: "status", options: ["ready", "streaming", "error"], default: "ready" },
  { type: "number" as const, prop: "versionCount", default: 3, min: 0, max: 9, step: 1 },
  { type: "boolean" as const, prop: "views", default: true },
  { type: "boolean" as const, prop: "showCloseButton", default: true },
];

function code(values: PlaygroundValues) {
  const attrs = [`title="${values.title}"`];
  if (values.presentation !== "auto") attrs.push(`presentation="${values.presentation}"`);
  if (values.status !== "ready") attrs.push(`status="${values.status}"`);
  attrs.push("open={open}", "onOpenChange={setOpen}");
  if (Number(values.versionCount) > 1) {
    attrs.push("version={version}", `versionCount={${values.versionCount}}`, "onVersionChange={setVersion}");
  }
  if (!values.showCloseButton) attrs.push("showCloseButton={false}");
  if (values.views) {
    attrs.push(`views={[
    { value: "preview", label: "Preview", content: <Preview /> },
    { value: "source", label: "Source", content: <CodeBlock code={source} /> },
  ]}`);
    return `<ArtifactPanel\n  ${attrs.join("\n  ")}\n/>`;
  }
  return `<ArtifactPanel\n  ${attrs.join("\n  ")}\n>\n  <Preview />\n</ArtifactPanel>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`title="${values.title}"`, "open"];
  if (values.presentation !== "auto") attrs.push(`presentation="${values.presentation}"`);
  if (values.status !== "ready") attrs.push(`status="${values.status}"`);
  if (Number(values.versionCount) > 1) attrs.push(`version="${values.versionCount}"`, `version-count="${values.versionCount}"`);
  if (!values.showCloseButton) attrs.push('show-close-button="false"');
  const body = values.views
    ? `  <kernel-artifact-view value="preview" label="Preview">…</kernel-artifact-view>\n  <kernel-artifact-view value="source" label="Source">…</kernel-artifact-view>`
    : "  …";
  return `<kernel-artifact-panel\n  ${attrs.join("\n  ")}\n>\n${body}\n</kernel-artifact-panel>`;
}

const REPORT = (
  <div style={{ display: "grid", gap: "var(--kernel-space-2)" }}>
    <strong>Q3 summary</strong>
    <p style={{ margin: 0, color: "var(--kernel-color-text-muted)" }}>
      Revenue grew 12% quarter on quarter, led by the self-serve plan.
    </p>
  </div>
);

function Stage({ values }: { values: PlaygroundValues }) {
  const count = Number(values.versionCount);
  const [version, setVersion] = useState(count);
  const [open, setOpen] = useState(values.presentation === "docked");
  // A fresh presentation starts from a known state; an overlay waits for
  // the button rather than opening over the page by itself.
  useEffect(() => setOpen(values.presentation === "docked"), [values.presentation]);
  useEffect(() => setVersion(count), [count]);

  return (
    <div style={{ display: "grid", gap: "var(--kernel-space-3)", inlineSize: "min(100%, 30rem)", justifyItems: "start" }}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Open panel
      </Button>
      <div style={{ blockSize: "18rem", inlineSize: "100%" }}>
        <ArtifactPanel
          title={String(values.title)}
          presentation={values.presentation as "docked" | "overlay" | "auto"}
          status={values.status as ArtifactPanelStatus}
          open={open}
          onOpenChange={setOpen}
          version={version}
          versionCount={count}
          onVersionChange={setVersion}
          showCloseButton={Boolean(values.showCloseButton)}
          views={
            values.views
              ? [
                  { value: "preview", label: "Preview", content: REPORT },
                  {
                    value: "source",
                    label: "Source",
                    content: (
                      <pre style={{ margin: 0, fontFamily: "var(--kernel-font-mono)", fontSize: "var(--kernel-font-size-sm)" }}>
                        {`## Q3 summary (v${version})\n\nRevenue grew 12%…`}
                      </pre>
                    ),
                  },
                ]
              : undefined
          }
        >
          {REPORT}
        </ArtifactPanel>
      </div>
    </div>
  );
}

export default function ArtifactPanelPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => <Stage values={values} />}
    />
  );
}
