import { Badge, DataTable, type DataTableColumn } from "@kernelui-lib/react";
import { components, type RegistryEntry } from "../../data/components";

const available = components.filter((entry) => entry.status === "available");

const columns: DataTableColumn<RegistryEntry>[] = [
  {
    key: "name",
    header: "Component",
    sortable: true,
    sortValue: (entry) => entry.name,
    render: (entry) => <a href={`/components/${entry.slug}/`}>{entry.name}</a>,
  },
  {
    key: "element",
    header: "Built on",
    render: (entry) => <code>{entry.element}</code>,
  },
  {
    key: "category",
    header: "Category",
    sortable: true,
    sortValue: (entry) => entry.category,
    render: (entry) => <Badge>{entry.category}</Badge>,
  },
];

/**
 * The whole catalogue, from the same registry the docs sidebar, CLI and
 * llms.txt read, in the library's own DataTable: filter, sort and page
 * through it, and every row is a real link to that component's page.
 * The "Built on" column is the pitch in data form — each component
 * names the native element doing the work.
 */
export default function ComponentIndex() {
  return (
    <DataTable
      columns={columns}
      data={available}
      rowKey={(entry) => entry.slug}
      filterPlaceholder="Filter components"
      pageSize={8}
      caption={`${available.length} components and the element each one is built on`}
    />
  );
}
