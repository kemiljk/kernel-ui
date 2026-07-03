import { Callout } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  {
    type: "enum" as const,
    prop: "variant",
    options: ["info", "success", "warning", "danger"],
    default: "info",
  },
  { type: "text" as const, prop: "title", default: "Payment failed" },
  {
    type: "text" as const,
    prop: "children",
    label: "body",
    default: "Update your card details to keep your subscription active.",
  },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [`variant="${values.variant}"`];
  if (values.title) attrs.push(`title="${values.title}"`);
  return `<Callout ${attrs.join(" ")}>${values.children || ""}</Callout>`;
}

function elementsCode(values: PlaygroundValues) {
  const titleSlot = values.title ? `<span slot="title">${values.title}</span>` : "";
  return `<kernel-callout variant="${values.variant}">${titleSlot}${values.children || ""}</kernel-callout>`;
}

export default function CalloutPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Callout
          variant={values.variant as "info" | "success" | "warning" | "danger"}
          title={String(values.title)}
        >
          {String(values.children)}
        </Callout>
      )}
    />
  );
}
