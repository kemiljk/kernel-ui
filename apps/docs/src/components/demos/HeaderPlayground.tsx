import { Header } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "text", label: "content", default: "Acme" },
  { type: "boolean" as const, prop: "sticky", default: false },
];

function code(values: PlaygroundValues) {
  const attrs = values.sticky ? " sticky" : "";
  return `<Header${attrs}>
  <strong>${values.text}</strong>
</Header>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs = values.sticky ? " sticky" : "";
  return `<kernel-header${attrs}>
  <strong>${values.text}</strong>
</kernel-header>`;
}

export default function HeaderPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Header sticky={Boolean(values.sticky)} style={{ inlineSize: "100%" }}>
          <strong>{String(values.text)}</strong>
        </Header>
      )}
    />
  );
}
