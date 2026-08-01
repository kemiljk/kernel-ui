import { Suggestion, SuggestionItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "boolean" as const, prop: "disabled", default: false },
  { type: "text" as const, prop: "label", default: "Suggestions" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.label !== "Suggestions") attrs.push(`label="${values.label}"`);
  if (values.disabled) attrs.push("disabled");
  const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<Suggestion${attrStr}>
  <SuggestionItem onSelect={…}>Summarise the latest release notes</SuggestionItem>
  <SuggestionItem onSelect={…}>Explain this TypeScript error</SuggestionItem>
</Suggestion>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [];
  if (values.label !== "Suggestions") attrs.push(`label="${values.label}"`);
  if (values.disabled) attrs.push("disabled");
  const attrStr = attrs.length ? ` ${attrs.join(" ")}` : "";
  return `<kernel-suggestion${attrStr}>
  <kernel-suggestion-item>Summarise the latest release notes</kernel-suggestion-item>
  <kernel-suggestion-item>Explain this TypeScript error</kernel-suggestion-item>
</kernel-suggestion>`;
}

export default function SuggestionPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      stageClassName="prop-playground-stage-start"
      render={(values) => (
        <Suggestion label={String(values.label)} disabled={Boolean(values.disabled)}>
          <SuggestionItem>Summarise the latest release notes</SuggestionItem>
          <SuggestionItem>Explain this TypeScript error</SuggestionItem>
          <SuggestionItem>Draft a migration checklist</SuggestionItem>
        </Suggestion>
      )}
    />
  );
}
