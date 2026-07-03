import { Composer } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "placeholder", default: "Ask anything…" },
  {
    type: "enum" as const,
    prop: "submitOn",
    options: ["mod+enter", "enter"],
    default: "mod+enter",
  },
  { type: "boolean" as const, prop: "thinking", default: false },
  { type: "boolean" as const, prop: "disabled", default: false },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`placeholder="${values.placeholder}"`];
  if (values.submitOn !== "mod+enter") attrs.push(`submitOn="${values.submitOn}"`);
  if (values.thinking) attrs.push("thinking");
  if (values.disabled) attrs.push("disabled");
  return `<Composer ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [`placeholder="${values.placeholder}"`];
  if (values.submitOn !== "mod+enter") attrs.push(`submit-on="${values.submitOn}"`);
  if (values.thinking) attrs.push("thinking");
  if (values.disabled) attrs.push("disabled");
  return `<kernel-composer ${attrs.join(" ")}></kernel-composer>`;
}

export default function ComposerPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Composer
          placeholder={String(values.placeholder)}
          submitOn={values.submitOn as "mod+enter" | "enter"}
          thinking={Boolean(values.thinking)}
          disabled={Boolean(values.disabled)}
        />
      )}
    />
  );
}
