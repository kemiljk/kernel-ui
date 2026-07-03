import { Breadcrumbs, BreadcrumbItem } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "homeLabel", label: "home label", default: "Home" },
  { type: "text" as const, prop: "homeHref", label: "home href", default: "/" },
  { type: "text" as const, prop: "settingsLabel", label: "settings label", default: "Settings" },
  { type: "text" as const, prop: "settingsHref", label: "settings href", default: "/settings" },
  { type: "text" as const, prop: "current", label: "current page", default: "Profile" },
];

function code(values: PlaygroundValues) {
  return `<Breadcrumbs>
  <BreadcrumbItem href="${values.homeHref}">${values.homeLabel}</BreadcrumbItem>
  <BreadcrumbItem href="${values.settingsHref}">${values.settingsLabel}</BreadcrumbItem>
  <BreadcrumbItem current>${values.current}</BreadcrumbItem>
</Breadcrumbs>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-breadcrumbs>
  <kernel-breadcrumb-item href="${values.homeHref}">${values.homeLabel}</kernel-breadcrumb-item>
  <kernel-breadcrumb-item href="${values.settingsHref}">${values.settingsLabel}</kernel-breadcrumb-item>
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
          <BreadcrumbItem href={String(values.homeHref)}>{String(values.homeLabel)}</BreadcrumbItem>
          <BreadcrumbItem href={String(values.settingsHref)}>{String(values.settingsLabel)}</BreadcrumbItem>
          <BreadcrumbItem current>{String(values.current)}</BreadcrumbItem>
        </Breadcrumbs>
      )}
    />
  );
}
