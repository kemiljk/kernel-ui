import { KernelElement, kernelClass } from "../../base";
import "../Table/Table.css";
import "../Pagination/Pagination.css";
import "../TextField/TextField.css";
import "./DataTable.css";

export interface KernelDataTableColumn<T> {
  key: string;
  header: string;
  render: (row: T) => string | Node;
  sortable?: boolean;
  /** Used for sorting when provided; falls back to a text coercion of
   * `render`'s output otherwise. */
  sortValue?: (row: T) => string | number;
}

type SortDirection = "ascending" | "descending";

function nodeToText(value: string | Node): string {
  return typeof value === "string" ? value : (value.textContent ?? "");
}

let dataTableCounter = 0;

/**
 * `<kernel-data-table>` — `<kernel-table>` + a filter input +
 * `<kernel-pagination>`, composed together (reusing their exact CSS
 * classes directly rather than nesting the custom elements themselves,
 * since this rebuilds its content on every filter/sort/page change and
 * plain DOM sidesteps any custom-element upgrade-timing concerns for
 * content that's this dynamic). Filter, sort, and page state live
 * inside the component.
 *
 * Columns and data carry render callbacks, which aren't expressible as
 * HTML attributes — set them via properties:
 * `tableEl.columns = [...]`, `tableEl.data = [...]`,
 * `tableEl.rowKey = (row) => row.id`.
 *
 * Attributes: `filter-placeholder` (default "Filter"), `page-size`
 * (default 10), `caption`.
 */
export class KernelDataTable<T = unknown> extends KernelElement {
  private readonly baseId = `kernel-data-table-${++dataTableCounter}`;
  private _columns: KernelDataTableColumn<T>[] = [];
  private _data: T[] = [];
  private _rowKey: (row: T) => string = (row) => String(row);
  private filter = "";
  private sort: { key: string; direction: SortDirection } | null = null;
  private page = 1;

  private filterInput!: HTMLInputElement;
  private statusEl!: HTMLElement;
  private theadEl!: HTMLTableSectionElement;
  private tbodyEl!: HTMLTableSectionElement;
  private paginationEl!: HTMLElement;

  static get observedAttributes() {
    return ["filter-placeholder", "page-size", "caption"];
  }

  get columns(): KernelDataTableColumn<T>[] {
    return this._columns;
  }

  set columns(value: KernelDataTableColumn<T>[]) {
    this._columns = value;
    if (this.native) this.renderAll();
  }

  get data(): T[] {
    return this._data;
  }

  set data(value: T[]) {
    this._data = value;
    if (this.native) this.renderAll();
  }

  get rowKey(): (row: T) => string {
    return this._rowKey;
  }

  set rowKey(value: (row: T) => string) {
    this._rowKey = value;
  }

  connectedCallback() {
    if (this.native) return;

    const root = document.createElement("div");
    root.className = kernelClass("DataTable");

    const filterId = `${this.baseId}-filter`;
    const filterWrapper = document.createElement("div");
    filterWrapper.className = `${kernelClass("TextField")} ${kernelClass("DataTable", "filter")}`;

    const filterLabel = document.createElement("label");
    filterLabel.className = kernelClass("TextField", "label");
    filterLabel.htmlFor = filterId;
    filterLabel.textContent = this.getAttribute("filter-placeholder") || "Filter";

    this.filterInput = document.createElement("input");
    this.filterInput.id = filterId;
    this.filterInput.className = kernelClass("TextField", "input");
    this.filterInput.addEventListener("input", () => {
      this.filter = this.filterInput.value;
      this.page = 1;
      this.renderAll();
    });

    filterWrapper.append(filterLabel, this.filterInput);

    this.statusEl = document.createElement("p");
    this.statusEl.setAttribute("role", "status");
    this.statusEl.className = kernelClass("DataTable", "status");

    const table = document.createElement("table");
    table.className = kernelClass("Table", "table");
    if (this.getAttribute("caption")) {
      const caption = document.createElement("caption");
      caption.className = kernelClass("Table", "caption");
      caption.textContent = this.getAttribute("caption");
      table.append(caption);
    }
    this.theadEl = document.createElement("thead");
    this.tbodyEl = document.createElement("tbody");
    table.append(this.theadEl, this.tbodyEl);

    this.paginationEl = document.createElement("nav");
    this.paginationEl.setAttribute("aria-label", "Pagination");
    this.paginationEl.className = `${kernelClass("Pagination")} ${kernelClass("DataTable", "pagination")}`;

    root.append(filterWrapper, this.statusEl, table, this.paginationEl);
    this.native = root;
    this.append(root);
    this.renderAll();
  }

  private get filtered(): T[] {
    const needle = this.filter.trim().toLowerCase();
    if (!needle) return this._data;
    return this._data.filter((row) =>
      this._columns.some((column) => nodeToText(column.render(row)).toLowerCase().includes(needle)),
    );
  }

  private get sorted(): T[] {
    const filtered = this.filtered;
    if (!this.sort) return filtered;
    const column = this._columns.find((candidate) => candidate.key === this.sort!.key);
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
      return this.sort!.direction === "ascending" ? comparison : -comparison;
    });
    return copy;
  }

  private ariaSortFor(key: string): "ascending" | "descending" | "none" {
    if (!this.sort || this.sort.key !== key) return "none";
    return this.sort.direction;
  }

  private handleSort(key: string) {
    if (!this.sort || this.sort.key !== key) this.sort = { key, direction: "ascending" };
    else if (this.sort.direction === "ascending") this.sort = { key, direction: "descending" };
    else this.sort = null;
    this.page = 1;
    this.renderAll();
  }

  private renderAll() {
    if (!this.native) return;

    const pageSize = Number(this.getAttribute("page-size") || "10");
    const sorted = this.sorted;
    const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
    const currentPage = Math.min(this.page, pageCount);
    const pageRows = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    this.statusEl.textContent = `${sorted.length} ${sorted.length === 1 ? "result" : "results"}`;

    this.theadEl.replaceChildren();
    const headRow = document.createElement("tr");
    for (const column of this._columns) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = kernelClass("Table", "head");
      if (column.sortable) {
        th.setAttribute("aria-sort", this.ariaSortFor(column.key));
        const button = document.createElement("button");
        button.type = "button";
        button.className = kernelClass("DataTable", "sortButton");
        button.append(document.createTextNode(column.header));
        const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        icon.setAttribute("viewBox", "0 0 16 16");
        icon.setAttribute("fill", "none");
        icon.setAttribute("aria-hidden", "true");
        icon.setAttribute("class", kernelClass("DataTable", "sortIcon"));
        if (this.sort?.key === column.key) icon.setAttribute("data-direction", this.sort.direction);
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", "M4 6L8 10L12 6");
        path.setAttribute("stroke", "currentColor");
        path.setAttribute("stroke-width", "1.75");
        path.setAttribute("stroke-linecap", "round");
        path.setAttribute("stroke-linejoin", "round");
        icon.append(path);
        button.append(icon);
        button.addEventListener("click", () => this.handleSort(column.key));
        th.append(button);
      } else {
        th.textContent = column.header;
      }
      headRow.append(th);
    }
    this.theadEl.append(headRow);

    this.tbodyEl.replaceChildren();
    for (const row of pageRows) {
      const tr = document.createElement("tr");
      tr.className = kernelClass("Table", "row");
      for (const column of this._columns) {
        const td = document.createElement("td");
        td.className = kernelClass("Table", "cell");
        const value = column.render(row);
        if (typeof value === "string") td.textContent = value;
        else td.append(value);
        tr.append(td);
      }
      this.tbodyEl.append(tr);
    }

    this.paginationEl.replaceChildren();
    const list = document.createElement("ol");
    list.className = kernelClass("Pagination", "list");

    const prevItem = document.createElement("li");
    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.className = kernelClass("Pagination", "control");
    prevButton.setAttribute("aria-label", "Go to previous page");
    prevButton.textContent = "‹ Previous";
    prevButton.disabled = currentPage === 1;
    prevButton.addEventListener("click", () => {
      this.page = Math.max(1, currentPage - 1);
      this.renderAll();
    });
    prevItem.append(prevButton);
    list.append(prevItem);

    for (let pageNumber = 1; pageNumber <= pageCount; pageNumber++) {
      const item = document.createElement("li");
      const link = document.createElement("a");
      link.href = "#";
      link.className = kernelClass("Pagination", "item");
      link.textContent = String(pageNumber);
      if (pageNumber === currentPage) link.setAttribute("aria-current", "page");
      link.addEventListener("click", (event) => {
        event.preventDefault();
        this.page = pageNumber;
        this.renderAll();
      });
      item.append(link);
      list.append(item);
    }

    const nextItem = document.createElement("li");
    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.className = kernelClass("Pagination", "control");
    nextButton.setAttribute("aria-label", "Go to next page");
    nextButton.textContent = "Next ›";
    nextButton.disabled = currentPage === pageCount;
    nextButton.addEventListener("click", () => {
      this.page = Math.min(pageCount, currentPage + 1);
      this.renderAll();
    });
    nextItem.append(nextButton);
    list.append(nextItem);

    this.paginationEl.append(list);
  }

  protected syncAttr(name: string, value: string | null) {
    if (!this.native) return;
    if (name === "filter-placeholder") {
      const label = this.native.querySelector(`.${kernelClass("TextField", "label")}`);
      if (label) label.textContent = value || "Filter";
    } else if (name === "page-size") {
      this.page = 1;
      this.renderAll();
    }
  }
}

customElements.define("kernel-data-table", KernelDataTable);
