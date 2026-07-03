import {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
} from "@kernelui-lib/react";

const rows = [
  { name: "Button", status: "Available" },
  { name: "Tooltip", status: "Planned" },
  { name: "Dialog", status: "Available" },
];

export default function TableDemo() {
  return (
    <Table>
      <TableCaption>Component status</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Component</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.name}>
            <TableCell>{row.name}</TableCell>
            <TableCell>
              <Badge variant={row.status === "Available" ? "success" : "neutral"}>
                {row.status}
              </Badge>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
