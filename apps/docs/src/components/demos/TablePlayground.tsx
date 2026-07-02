import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "text" as const, prop: "service", label: "row 1 service", default: "API" },
  {
    type: "enum" as const,
    prop: "status",
    label: "row 1 status",
    options: ["Operational", "Degraded", "Down"],
    default: "Operational",
  },
];

function code(values: PlaygroundValues) {
  return `<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Service</TableHead>
      <TableHead>Status</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    <TableRow>
      <TableCell>${values.service}</TableCell>
      <TableCell>${values.status}</TableCell>
    </TableRow>
  </TableBody>
</Table>`;
}

function elementsCode(values: PlaygroundValues) {
  return `<kernel-table>
  <kernel-table-header>
    <kernel-table-row>
      <kernel-table-head>Service</kernel-table-head>
      <kernel-table-head>Status</kernel-table-head>
    </kernel-table-row>
  </kernel-table-header>
  <kernel-table-body>
    <kernel-table-row>
      <kernel-table-cell>${values.service}</kernel-table-cell>
      <kernel-table-cell>${values.status}</kernel-table-cell>
    </kernel-table-row>
  </kernel-table-body>
</kernel-table>`;
}

export default function TablePlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableCell>{String(values.service)}</TableCell>
              <TableCell>{String(values.status)}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell>Webhooks</TableCell>
              <TableCell>Degraded</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      )}
    />
  );
}
