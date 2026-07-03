import { DataTable, Badge } from "@kernelui-lib/react";
import type { DataTableColumn } from "@kernelui-lib/react";

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
  { name: "Greta Lindqvist", role: "Product", status: "Active" },
  { name: "Hugo Ferreira", role: "Engineering", status: "Away" },
  { name: "Ines Moreau", role: "Design", status: "Active" },
  { name: "Jonas Kowalski", role: "Engineering", status: "Offline" },
  { name: "Kira Petrova", role: "Product", status: "Active" },
  { name: "Liam O'Sullivan", role: "Engineering", status: "Away" },
  { name: "Mira Sato", role: "Design", status: "Active" },
  { name: "Noel Dubois", role: "Product", status: "Offline" },
  { name: "Priya Raman", role: "Engineering", status: "Active" },
  { name: "Quinn Fischer", role: "Design", status: "Active" },
  { name: "Rosa Jimenez", role: "Product", status: "Away" },
];

const columns: DataTableColumn<TeamMember>[] = [
  {
    key: "name",
    header: "Name",
    render: (row) => row.name,
    sortable: true,
  },
  {
    key: "role",
    header: "Role",
    render: (row) => row.role,
    sortable: true,
  },
  {
    key: "status",
    header: "Status",
    render: (row) => (
      <Badge variant={row.status === "Active" ? "success" : "neutral"}>{row.status}</Badge>
    ),
    sortValue: (row) => row.status,
  },
];

export default function DataTableDemo() {
  return (
    <DataTable
      columns={columns}
      data={members}
      rowKey={(row) => row.name}
      filterPlaceholder="Filter by name, role, or status"
      pageSize={5}
      caption="Team members"
    />
  );
}
