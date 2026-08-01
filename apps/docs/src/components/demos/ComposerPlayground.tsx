import { Button, Composer } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";
import { PaperclipIcon } from "../icons";
import { EXAMPLE_QUERY } from "./ComposerThinkingExample";

const controls = [
  { type: "text" as const, prop: "placeholder", default: "Ask anything…" },
  {
    type: "enum" as const,
    prop: "submitOn",
    options: ["mod+enter", "enter"],
    default: "mod+enter",
  },
  { type: "boolean" as const, prop: "actionsLeading", label: "actionsLeading", default: true },
  { type: "boolean" as const, prop: "actionsTrailing", label: "actionsTrailing", default: true },
  { type: "boolean" as const, prop: "thinking", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`placeholder="${values.placeholder}"`];
  if (values.submitOn !== "mod+enter") attrs.push(`submitOn="${values.submitOn}"`);
  if (values.thinking) {
    attrs.push("thinking");
    attrs.push(`defaultValue="${EXAMPLE_QUERY}"`);
  }
  if (values.disabled) attrs.push("disabled");
  const leading = values.actionsLeading
    ? `\n  actionsLeading={\n    <Button variant="ghost" size="sm" aria-label="Attach" iconStart={<PaperclipIcon />} />\n  }`
    : "";
  const trailing = values.actionsTrailing
    ? `\n  actionsTrailing={({ submit }) => (\n    <Button variant="primary" size="sm" onClick={submit}>Send</Button>\n  )}`
    : "";
  return `<Composer ${attrs.join(" ")}${leading}${trailing}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`placeholder="${values.placeholder}"`];
  if (values.submitOn !== "mod+enter") attrs.push(`submit-on="${values.submitOn}"`);
  if (values.thinking) {
    attrs.push("thinking");
    attrs.push(`value="${EXAMPLE_QUERY}"`);
  }
  if (values.disabled) attrs.push("disabled");
  const slots: string[] = [];
  if (values.actionsLeading) {
    slots.push(`  <button slot="leading" type="button" aria-label="Attach">Attach</button>`);
  }
  if (values.actionsTrailing) {
    slots.push(`  <button slot="trailing" type="button">Send</button>`);
  }
  if (slots.length === 0) {
    return `<kernel-composer ${attrs.join(" ")}></kernel-composer>`;
  }
  return `<kernel-composer ${attrs.join(" ")}>\n${slots.join("\n")}\n</kernel-composer>`;
}

export default function ComposerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Composer
          key={values.thinking ? "thinking" : "idle"}
          placeholder={String(values.placeholder)}
          submitOn={values.submitOn as "mod+enter" | "enter"}
          defaultValue={values.thinking ? EXAMPLE_QUERY : ""}
          thinking={Boolean(values.thinking)}
          disabled={Boolean(values.disabled)}
          actionsLeading={
            values.actionsLeading ? (
              <Button
                variant="ghost"
                size="sm"
                aria-label="Attach"
                iconStart={<PaperclipIcon width="14" height="14" />}
              />
            ) : undefined
          }
          actionsTrailing={
            values.actionsTrailing
              ? ({ submit }) => (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={submit}
                    disabled={Boolean(values.thinking) || Boolean(values.disabled)}
                  >
                    Send
                  </Button>
                )
              : undefined
          }
        />
      )}
    />
  );
}
