import { forwardRef } from "react";
import type {
  HTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Table.module.css";

type Div<TState> = ClassNameValue<TState>;

export interface TableProps extends Omit<HTMLAttributes<HTMLTableElement>, "className"> {
  className?: Div<Record<string, never>>;
}

/** A real `<table>`. Wrap it in a scrolling `<div>` yourself if it needs
 * to overflow on narrow screens, that's a layout concern, not the
 * table's. */
export const Table = forwardRef<HTMLTableElement, TableProps>(function Table(
  { className, ...rest },
  ref,
) {
  return (
    <table
      {...rest}
      ref={ref}
      className={[styles.table, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
    />
  );
});

export const TableCaption = forwardRef<
  HTMLTableCaptionElement,
  Omit<HTMLAttributes<HTMLTableCaptionElement>, "className"> & { className?: Div<Record<string, never>> }
>(function TableCaption({ className, ...rest }, ref) {
  return (
    <caption
      {...rest}
      ref={ref}
      className={[styles.caption, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  Omit<HTMLAttributes<HTMLTableSectionElement>, "className"> & { className?: Div<Record<string, never>> }
>(function TableHeader({ className, ...rest }, ref) {
  return <thead {...rest} ref={ref} className={resolveClassName(className, {})} />;
});

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  Omit<HTMLAttributes<HTMLTableSectionElement>, "className"> & { className?: Div<Record<string, never>> }
>(function TableBody({ className, ...rest }, ref) {
  return <tbody {...rest} ref={ref} className={resolveClassName(className, {})} />;
});

export const TableRow = forwardRef<
  HTMLTableRowElement,
  Omit<HTMLAttributes<HTMLTableRowElement>, "className"> & { className?: Div<Record<string, never>> }
>(function TableRow({ className, ...rest }, ref) {
  return (
    <tr
      {...rest}
      ref={ref}
      className={[styles.row, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});

export interface TableHeadProps
  extends Omit<ThHTMLAttributes<HTMLTableCellElement>, "className"> {
  className?: Div<Record<string, never>>;
}

/** `scope="col"` by default, since a header cell almost always heads a
 * column; pass `scope="row"` explicitly for row headers. */
export const TableHead = forwardRef<HTMLTableCellElement, TableHeadProps>(
  function TableHead({ className, scope = "col", ...rest }, ref) {
    return (
      <th
        {...rest}
        ref={ref}
        scope={scope}
        className={[styles.head, resolveClassName(className, {})].filter(Boolean).join(" ")}
      />
    );
  },
);

export const TableCell = forwardRef<
  HTMLTableCellElement,
  Omit<TdHTMLAttributes<HTMLTableCellElement>, "className"> & { className?: Div<Record<string, never>> }
>(function TableCell({ className, ...rest }, ref) {
  return (
    <td
      {...rest}
      ref={ref}
      className={[styles.cell, resolveClassName(className, {})].filter(Boolean).join(" ")}
    />
  );
});
