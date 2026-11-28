import { Kbd } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "keys", label: "keys (space-separated)", default: "mod shift P" },
  {
    type: "enum" as const,
    prop: "platform",
    options: ["auto", "apple", "other"],
    default: "auto",
  },
  { type: "text" as const, prop: "separator", default: "+" },
];

function keysOf(values: PlaygroundValues): string[] {
  return String(values.keys).split(/\s+/).filter(Boolean);
}

function code(values: PlaygroundValues) {
  const keys = keysOf(values);
  const attrs = [`keys={${JSON.stringify(keys)}}`];
  if (values.platform !== "auto") attrs.push(`platform="${values.platform}"`);
  if (values.separator !== "+") attrs.push(`separator="${values.separator}"`);
  return `<Kbd ${attrs.join(" ")} />`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = [`keys="${keysOf(values).join(" ")}"`];
  if (values.platform !== "auto") attrs.push(`platform="${values.platform}"`);
  if (values.separator !== "+") attrs.push(`separator="${values.separator}"`);
  return `<kernel-kbd ${attrs.join(" ")}></kernel-kbd>`;
}

export default function KbdPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Kbd
          keys={keysOf(values)}
          platform={values.platform as "auto" | "apple" | "other"}
          separator={String(values.separator)}
        />
      )}
    />
  );
}
