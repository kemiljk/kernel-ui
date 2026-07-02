import {
  BreadcrumbItem,
  Breadcrumbs,
  Pagination,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@kernelui/react";

/**
 * No `href` on any non-current item: `BreadcrumbItem`/`PaginationItem`
 * both render a real `<a>` and spread it straight through, so a real path
 * would actually navigate the homepage away — and `/docs`/`/docs/components`
 * were never even real paths on this site to begin with. Omitting `href`
 * (it's optional) keeps them looking exactly like real breadcrumb/page
 * links without turning them into one; `PaginationPrevious`/`Next` are
 * plain `<button type="button">`s with no handler, already inert.
 */
export default function DocsNav() {
  return (
    <div className="showcase-item">
      <div className="showcase-stack">
        <Breadcrumbs>
          <BreadcrumbItem>Docs</BreadcrumbItem>
          <BreadcrumbItem>Components</BreadcrumbItem>
          <BreadcrumbItem current>Button</BreadcrumbItem>
        </Breadcrumbs>
        <Pagination>
          <PaginationPrevious disabled />
          <PaginationItem current>1</PaginationItem>
          <PaginationItem>2</PaginationItem>
          <PaginationItem>3</PaginationItem>
          <PaginationNext />
        </Pagination>
      </div>
    </div>
  );
}
