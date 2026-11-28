import { useEffect, useMemo, useRef, useState } from "react";
import {
  Button,
  Select,
  SelectOption,
  SchemaRenderer,
  Textarea,
  parsePartialJson,
  type SchemaAction,
  type SchemaIssue,
} from "@kernelui-lib/react";
import { schemaSampleNames, schemaSamples } from "./schemaSamples";

const pretty = (value: unknown) => JSON.stringify(value, null, 2);

/** Edit the model's JSON and watch it render, or replay it a few characters
 * at a time through parsePartialJson to see a streaming response build up. */
export default function SchemaRendererDemo() {
  const [sample, setSample] = useState(schemaSampleNames[0]!);
  const [source, setSource] = useState(() => pretty(schemaSamples[sample]));
  const [streamed, setStreamed] = useState<string | null>(null);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [lastAction, setLastAction] = useState<SchemaAction | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearInterval(timer.current), []);

  const streaming = streamed !== null;
  const text = streamed ?? source;
  // While editing, half-typed JSON is just a partial document too.
  const value = useMemo(() => parsePartialJson(text), [text]);

  function stream() {
    window.clearInterval(timer.current);
    setIssues([]);
    let index = 0;
    setStreamed("");
    timer.current = window.setInterval(() => {
      index = Math.min(source.length, index + 6);
      if (index >= source.length) {
        window.clearInterval(timer.current);
        setStreamed(null);
        return;
      }
      setStreamed(source.slice(0, index));
    }, 16);
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))",
        gap: "var(--kernel-space-4)",
        inlineSize: "100%",
        alignItems: "start",
      }}
    >
      <div style={{ display: "grid", gap: "var(--kernel-space-3)", minInlineSize: 0 }}>
        <Select
          label="Sample"
          value={sample}
          onChange={(event) => {
            const next = event.currentTarget.value;
            setSample(next);
            setSource(pretty(schemaSamples[next]));
            setIssues([]);
            setLastAction(null);
          }}
        >
          {schemaSampleNames.map((name) => (
            <SelectOption key={name} value={name}>
              {name}
            </SelectOption>
          ))}
        </Select>
        <Textarea
          label="Model output (JSON)"
          value={text}
          readOnly={streaming}
          rows={14}
          spellCheck={false}
          onChange={(event) => {
            setSource(event.currentTarget.value);
            setIssues([]);
          }}
          style={{ fontFamily: "var(--kernel-font-mono)", fontSize: "var(--kernel-font-size-sm)" }}
        />
        <div>
          <Button onClick={stream}>
            {streaming ? "Restart stream" : "Stream it"}
          </Button>
        </div>
      </div>
      <div style={{ display: "grid", gap: "var(--kernel-space-3)", minInlineSize: 0 }}>
        <div
          style={{
            padding: "var(--kernel-padding-container-curve)",
            border: "1px solid var(--kernel-color-border)",
            borderRadius: "var(--kernel-radius-container)",
            background: "var(--kernel-color-canvas)",
            minBlockSize: "10rem",
          }}
        >
          <SchemaRenderer
            value={value}
            streaming={streaming}
            onAction={setLastAction}
            onIssue={(issue) => setIssues((list) => [...list, issue])}
          />
        </div>
        <output
          aria-live="polite"
          style={{ fontSize: "var(--kernel-font-size-sm)", color: "var(--kernel-color-text-muted)", overflowWrap: "anywhere" }}
        >
          {lastAction ? (
            <>
              <strong style={{ color: "var(--kernel-color-text)" }}>onAction</strong>{" "}
              <code>{JSON.stringify(lastAction)}</code>
            </>
          ) : (
            "Press a button to see the action it sends back."
          )}
        </output>
        {issues.length > 0 ? (
          <div style={{ fontSize: "var(--kernel-font-size-sm)", color: "var(--kernel-color-text-muted)" }}>
            <strong style={{ color: "var(--kernel-color-text)" }}>onIssue</strong>
            <ul style={{ margin: "var(--kernel-space-1) 0 0", paddingInlineStart: "1.25rem" }}>
              {issues.map((issue, index) => (
                <li key={index}>
                  <code>{issue.code}</code> at <code>{issue.path}</code>: {issue.message}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
