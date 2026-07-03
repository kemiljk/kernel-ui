import { Breadcrumbs, BreadcrumbItem } from "@kernelui-lib/react";

export default function BreadcrumbsDemo() {
  return (
    <Breadcrumbs>
      <BreadcrumbItem href="/" onClick={(event) => event.preventDefault()}>
        Home
      </BreadcrumbItem>
      <BreadcrumbItem href="/components/" onClick={(event) => event.preventDefault()}>
        Components
      </BreadcrumbItem>
      <BreadcrumbItem current>Breadcrumbs</BreadcrumbItem>
    </Breadcrumbs>
  );
}
