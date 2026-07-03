import { Pagination, PaginationItem, PaginationPrevious, PaginationNext } from "@kernelui/react";
import Playground, { type PlaygroundValues } from "../Playground";

const controls = [
  { type: "enum" as const, prop: "current", options: ["1", "2", "3"], default: "1" },
  { type: "boolean" as const, prop: "disabled", label: "disabled controls", default: false },
];

function code(values: PlaygroundValues) {
  const cur = (n: string) => (values.current === n ? " current" : "");
  const disabled = values.disabled ? " disabled" : "";
  return `<Pagination>
  <PaginationPrevious${disabled} />
  <PaginationItem href="?page=1"${cur("1")}>1</PaginationItem>
  <PaginationItem href="?page=2"${cur("2")}>2</PaginationItem>
  <PaginationItem href="?page=3"${cur("3")}>3</PaginationItem>
  <PaginationNext${disabled} />
</Pagination>`;
}

function elementsCode(values: PlaygroundValues) {
  const cur = (n: string) => (values.current === n ? " current" : "");
  const disabled = values.disabled ? " disabled" : "";
  return `<kernel-pagination>
  <kernel-pagination-previous${disabled}></kernel-pagination-previous>
  <kernel-pagination-item href="?page=1"${cur("1")}>1</kernel-pagination-item>
  <kernel-pagination-item href="?page=2"${cur("2")}>2</kernel-pagination-item>
  <kernel-pagination-item href="?page=3"${cur("3")}>3</kernel-pagination-item>
  <kernel-pagination-next${disabled}></kernel-pagination-next>
</kernel-pagination>`;
}

export default function PaginationPlayground() {
  return (
    <Playground
      controls={controls}
      code={code}
      elementsCode={elementsCode}
      render={(values) => (
        <Pagination>
          <PaginationPrevious disabled={Boolean(values.disabled)} />
          <PaginationItem href="?page=1" current={values.current === "1"}>1</PaginationItem>
          <PaginationItem href="?page=2" current={values.current === "2"}>2</PaginationItem>
          <PaginationItem href="?page=3" current={values.current === "3"}>3</PaginationItem>
          <PaginationNext disabled={Boolean(values.disabled)} />
        </Pagination>
      )}
    />
  );
}
