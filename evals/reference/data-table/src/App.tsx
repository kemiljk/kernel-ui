import { DataTable, type DataTableColumn } from "@kernelui-lib/react";

type Member = { id: string; name: string; email: string; role: string; lastActive: string };

const members: Member[] = [
  { id: "1", name: "Ada Lovelace", email: "ada@example.com", role: "Owner", lastActive: "2026-11-28T09:12:00Z" },
  { id: "2", name: "Grace Hopper", email: "grace@example.com", role: "Admin", lastActive: "2026-11-27T16:40:00Z" },
  { id: "3", name: "Alan Turing", email: "alan@example.com", role: "Editor", lastActive: "2026-11-21T11:05:00Z" },
  { id: "4", name: "Katherine Johnson", email: "katherine@example.com", role: "Editor", lastActive: "2026-11-26T08:30:00Z" },
  { id: "5", name: "Edsger Dijkstra", email: "edsger@example.com", role: "Viewer", lastActive: "2026-10-30T14:22:00Z" },
  { id: "6", name: "Margaret Hamilton", email: "margaret@example.com", role: "Admin", lastActive: "2026-11-28T07:55:00Z" },
  { id: "7", name: "Donald Knuth", email: "donald@example.com", role: "Viewer", lastActive: "2026-11-12T19:48:00Z" },
  { id: "8", name: "Barbara Liskov", email: "barbara@example.com", role: "Editor", lastActive: "2026-11-24T10:15:00Z" },
];

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
});

const columns: DataTableColumn<Member>[] = [
  { key: "name", header: "Name", sortable: true, render: (m) => m.name },
  { key: "email", header: "Email", render: (m) => m.email },
  { key: "role", header: "Role", render: (m) => m.role },
  {
    key: "lastActive",
    header: "Last active",
    sortable: true,
    // Sort by the timestamp, not the formatted text.
    sortValue: (m) => Date.parse(m.lastActive),
    render: (m) => <time dateTime={m.lastActive}>{dateFormat.format(new Date(m.lastActive))}</time>,
  },
];

export default function App() {
  return (
    <main className="page">
      <h1>Team</h1>
      <DataTable
        caption="Team members"
        columns={columns}
        data={members}
        rowKey={(m) => m.id}
        filterLabel="Filter members"
        filterPlaceholder="Name, email or role"
      />
    </main>
  );
}
