import { useId, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Table,
  TableCaption,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "../Table/Table";
import { Pagination, PaginationItem, PaginationPrevious, PaginationNext } from "../Pagination/Pagination";
import { TextField } from "../TextField/TextField";
import styles from "./DataTable.module.css";

export interface DataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  /** Used for sorting when provided; falls back to a string coercion of
   * `render`'s output otherwise, since `render` may return an element
   * rather than a comparable primitive. */
  sortValue?: (row: T) => string | number;
}

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  rowKey: (row: T) => string;
  filterPlaceholder?: string;
  pageSize?: number;
  caption?: ReactNode;
}

type SortDirection = "ascending" | "descending";

/** Coerces whatever a cell renders down to plain text, for both the
 * filter match and the sort fallback: a `ReactNode` isn't comparable or
 * searchable on its own. */
function nodeToText(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join(" ");
  return "";
}

/**
 * `Table` + `TextField` + `Pagination` composed together, with filter,
 * sort, and page state managed internally, this is the "behaviour
 * layered on top" the catalog promises, not a lower-level primitive of
 * its own. Reach for the parts directly instead if you need the state
 * to live outside this component.
 */
export function DataTable<T>({
  columns,
  data,
  rowKey,
  filterPlaceholder = "Filter",
  pageSize = 10,
  caption,
}: DataTableProps<T>) {
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<{ key: string; direction: SortDirection } | null>(null);
  const [page, setPage] = useState(1);
  const filterId = useId();

  const filtered = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    if (!needle) return data;
    return data.filter((row) =>
      columns.some((column) => nodeToText(column.render(row)).toLowerCase().includes(needle)),
    );
  }, [data, columns, filter]);

  const sorted = useMemo(() => {
    if (!sort) return filtered;
    const column = columns.find((candidate) => candidate.key === sort.key);
    if (!column) return filtered;

    const valueOf = (row: T) => column.sortValue?.(row) ?? nodeToText(column.render(row));

    const copy = [...filtered];
    copy.sort((a, b) => {
      const valueA = valueOf(a);
      const valueB = valueOf(b);
      const comparison =
        typeof valueA === "number" && typeof valueB === "number"
          ? valueA - valueB
          : String(valueA).localeCompare(String(valueB));
      return sort.direction === "ascending" ? comparison : -comparison;
    });
    return copy;
  }, [filtered, sort, columns]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleFilterChange(value: string) {
    setFilter(value);
    setPage(1);
  }

  function handleSort(key: string) {
    setSort((current) => {
      if (!current || current.key !== key) return { key, direction: "ascending" };
      if (current.direction === "ascending") return { key, direction: "descending" };
      return null;
    });
    setPage(1);
  }

  function ariaSortFor(key: string): "ascending" | "descending" | "none" {
    if (!sort || sort.key !== key) return "none";
    return sort.direction;
  }

  return (
    <div className={styles.root}>
      <TextField
        id={filterId}
        label={filterPlaceholder}
        value={filter}
        onChange={(event) => handleFilterChange(event.target.value)}
        className={styles.filter}
      />
      <p className={styles.status} role="status">
        {sorted.length} {sorted.length === 1 ? "result" : "results"}
      </p>
      <Table>
        {caption ? <TableCaption>{caption}</TableCaption> : null}
        <TableHeader>
          <TableRow>
            {columns.map((column) =>
              column.sortable ? (
                <TableHead key={column.key} aria-sort={ariaSortFor(column.key)}>
                  <button
                    type="button"
                    className={styles.sortButton}
                    onClick={() => handleSort(column.key)}
                  >
                    {column.header}
                    <svg
                      className={styles.sortIcon}
                      data-direction={sort?.key === column.key ? sort.direction : undefined}
                      viewBox="0 0 16 16"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 6L8 10L12 6"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </TableHead>
              ) : (
                <TableHead key={column.key}>{column.header}</TableHead>
              ),
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {pageRows.map((row) => (
            <TableRow key={rowKey(row)}>
              {columns.map((column) => (
                <TableCell key={column.key}>{column.render(row)}</TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <Pagination className={styles.pagination}>
        <PaginationPrevious
          disabled={currentPage === 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        />
        {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
          <PaginationItem
            key={pageNumber}
            href="#"
            current={pageNumber === currentPage}
            onClick={(event) => {
              event.preventDefault();
              setPage(pageNumber);
            }}
          >
            {pageNumber}
          </PaginationItem>
        ))}
        <PaginationNext
          disabled={currentPage === pageCount}
          onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
        />
      </Pagination>
    </div>
  );
}
