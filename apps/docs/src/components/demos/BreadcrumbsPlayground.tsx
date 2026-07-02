import { Breadcrumbs, BreadcrumbItem } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "current", label: "current page", default: "Profile" },
];

function code(values: PlaygroundValues) {
  return `<Breadcrumbs>
  <BreadcrumbItem href="/">Home</BreadcrumbItem>
  <BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
  <BreadcrumbItem current>${values.current}</BreadcrumbItem>
</Breadcrumbs>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-breadcrumbs>
  <kernel-breadcrumb-item href="/">Home</kernel-breadcrumb-item>
  <kernel-breadcrumb-item href="/settings">Settings</kernel-breadcrumb-item>
  <kernel-breadcrumb-item current>${values.current}</kernel-breadcrumb-item>
</kernel-breadcrumbs>`;
}

export default function BreadcrumbsPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Breadcrumbs>
          <BreadcrumbItem href="/">Home</BreadcrumbItem>
          <BreadcrumbItem href="/settings">Settings</BreadcrumbItem>
          <BreadcrumbItem current>{String(values.current)}</BreadcrumbItem>
        </Breadcrumbs>
      )}
    />
  );
}
