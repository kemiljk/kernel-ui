import { Breadcrumbs, BreadcrumbItem } from "@kernelui/react";

export default function BreadcrumbsDemo() {
  return (
    <Breadcrumbs>
      <BreadcrumbItem href="/">Home</BreadcrumbItem>
      <BreadcrumbItem href="/components/">Components</BreadcrumbItem>
      <BreadcrumbItem current>Breadcrumbs</BreadcrumbItem>
    </Breadcrumbs>
  );
}
