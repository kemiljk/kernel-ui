import { Footer } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "text", label: "copyright text", default: "© 2026 Acme Inc." },
];

function code(values: PlaygroundValues) {
  return `<Footer>
  <span>${values.text}</span>
  <a href="/privacy">Privacy</a>
</Footer>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-footer>
  <span>${values.text}</span>
  <a href="/privacy">Privacy</a>
</kernel-footer>`;
}

export default function FooterPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Footer style={{ inlineSize: "100%" }}>
          <span>{String(values.text)}</span>
          <a href="/privacy">Privacy</a>
        </Footer>
      )}
    />
  );
}
