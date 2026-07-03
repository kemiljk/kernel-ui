import { Sidebar } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "ariaLabel", label: "aria-label", default: "Table of contents" },
];

function code(values: PlaygroundValues) {
  return `<Sidebar aria-label="${values.ariaLabel}">
  <ul>
    <li>Installation</li>
    <li>Usage</li>
  </ul>
</Sidebar>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-sidebar aria-label="${values.ariaLabel}">
  <ul>
    <li>Installation</li>
    <li>Usage</li>
  </ul>
</kernel-sidebar>`;
}

export default function SidebarPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Sidebar aria-label={String(values.ariaLabel)}>
          <ul>
            <li>Installation</li>
            <li>Usage</li>
          </ul>
        </Sidebar>
      )}
    />
  );
}
