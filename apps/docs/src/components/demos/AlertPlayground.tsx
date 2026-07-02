import { Alert } from "@kernelui/react";
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
  return `<Alert ${attrs.join(" ")}>${values.children || ""}</Alert>`;
}

export default function AlertPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      render={(values) => (
        <Alert
          variant={values.variant as "info" | "success" | "warning" | "danger"}
          title={String(values.title)}
        >
          {String(values.children)}
        </Alert>
      )}
    />
  );
}
