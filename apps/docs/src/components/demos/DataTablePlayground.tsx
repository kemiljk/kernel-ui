import { DataTable, Badge } from "@kernelui-lib/react";
import type { DataTableColumn } from "@kernelui-lib/react";
import Playground, { type PlaygroundValues } from "../Playground";

interface TeamMember {
  name: string;
  role: string;
  status: "Active" | "Away" | "Offline";
}

const members: TeamMember[] = [
  { name: "Ada Okoye", role: "Engineering", status: "Active" },
  { name: "Bram Visser", role: "Design", status: "Away" },
  { name: "Celia Nakamura", role: "Engineering", status: "Active" },
  { name: "Dario Conti", role: "Product", status: "Offline" },
  { name: "Elin Berg", role: "Engineering", status: "Active" },
  { name: "Farid Haddad", role: "Design", status: "Offline" },
];

const columns: DataTableColumn<TeamMember>[] = [
  { key: "name", header: "Name", render: (row) => row.name, sortable: true },
  { key: "role", header: "Role", render: (row) => row.role, sortable: true },
  {
    key: "status",
    header: "Status",
    render: (row) => <Badge variant={row.status === "Active" ? "success" : "neutral"}>{row.status}</Badge>,
    sortValue: (row) => row.status,
  },
];

const controls = [
  { type: "text" as const, prop: "filterPlaceholder", default: "Filter by name, role, or status" },
  { type: "number" as const, prop: "pageSize", default: 3, min: 1, max: 6, step: 1 },
  { type: "text" as const, prop: "caption", default: "" },
];

function code(values: PlaygroundValues) {
  const attrs: string[] = [
    "columns={columns}",
    "data={members}",
    "rowKey={(row) => row.name}",
    `filterPlaceholder="${values.filterPlaceholder}"`,
    `pageSize={${Number(values.pageSize)}}`,
  ];
  if (values.caption) attrs.push(`caption="${values.caption}"`);
  return `<DataTable\n  ${attrs.join("\n  ")}\n/>`;
}

function elementsCode(values: PlaygroundValues) {
  const attrs: string[] = [
    `filter-placeholder="${values.filterPlaceholder}"`,
    `page-size="${Number(values.pageSize)}"`,
  ];
  if (values.caption) attrs.push(`caption="${values.caption}"`);
  return `<kernel-data-table id="table" ${attrs.join(" ")}></kernel-data-table>

<script type="module">
  const table = document.getElementById("table");
  table.columns = [
    { key: "name", header: "Name", render: (row) => row.name, sortable: true },
    { key: "role", header: "Role", render: (row) => row.role, sortable: true },
  ];
  table.rowKey = (row) => row.name;
  table.data = members;
</script>`;
}

export default function DataTablePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <DataTable
          columns={columns}
          data={members}
          rowKey={(row) => row.name}
          filterPlaceholder={String(values.filterPlaceholder)}
          pageSize={Number(values.pageSize)}
          caption={String(values.caption) || undefined}
        />
      )}
    />
  );
}
