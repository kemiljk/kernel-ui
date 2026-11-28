import { KernelElement, dataAttr, kernelClass } from "../../base";
import {
  addMonths,
  chunkIntoWeeks,
  formatDateAttr,
  getVisibleDays,
  isSameDay,
  isWithinRange,
  parseDateAttr,
  startOfDay,
  gridTabStop,
  weekEdgeIndex,
} from "../../utils/dateGrid";
import "./DateRangePicker.css";

const WEEKDAY_LABELS: readonly string[] = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const PREV_PATH = "M10 3L5 8L10 13";
const NEXT_PATH = "M6 3L11 8L6 13";

function arrowIcon(path: string, className: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  // Mirrors in RTL (reset.css), where "previous month" sits on the right.
  svg.setAttribute("data-icon-directional", "");
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

let rangePickerCounter = 0;

/**
 * `<kernel-date-range-picker>` — same table-grid markup and month
 * navigation as `<kernel-date-picker>`, but tracking two endpoints
 * instead of one. A click either starts a fresh range or completes the
 * open one; once both ends are set, the next click starts over. The
 * in-progress second half of a range (before it's clicked) is a hover
 * preview only — it never reaches the `valuechange` event.
 *
 * Built-in strings: `label-previous-month` ("Previous month"),
 * `label-next-month` ("Next month"), `label-weekdays` (comma-separated,
 * Sunday first; default "Su,Mo,Tu,We,Th,Fr,Sa"), or the `labels` property.
 *
 * Attributes: `value-from`, `value-to`, `min-date`, `max-date` — all
 * `YYYY-MM-DD`. Events: `valuechange`
 * (`event.detail` = `{ from?, to? }`, each a `YYYY-MM-DD` string).
 */
export class KernelDateRangePicker extends KernelElement {
  private readonly baseId = `kernel-date-range-picker-${++rangePickerCounter}`;
  private from: Date | undefined;
  private to: Date | undefined;
  private hoverDate: Date | null = null;
  private visibleMonth: Date = startOfDay(new Date());
  private focusedDay: Date | undefined;
  private headingEl!: HTMLElement;
  private tbodyEl!: HTMLTableSectionElement;

  static get observedAttributes() {
    return ["value-from", "value-to", "min-date", "max-date", "label-previous-month", "label-next-month", "label-weekdays"];
  }

  get minDate(): Date | undefined {
    return parseDateAttr(this.getAttribute("min-date"));
  }

  get maxDate(): Date | undefined {
    return parseDateAttr(this.getAttribute("max-date"));
  }

  connectedCallback() {
    if (this.native) return;

    this.from = parseDateAttr(this.getAttribute("value-from"));
    this.to = parseDateAttr(this.getAttribute("value-to"));
    this.visibleMonth = startOfDay(this.from ?? new Date());

    const root = document.createElement("div");
    root.className = kernelClass("DateRangePicker");
    root.addEventListener("pointerleave", () => {
      this.hoverDate = null;
      this.renderGrid();
    });

    const header = document.createElement("div");
    header.className = kernelClass("DateRangePicker", "header");

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", this.builtInLabel("previousMonth", "Previous month"));
    prevButton.className = kernelClass("DateRangePicker", "navButton");
    prevButton.append(arrowIcon(PREV_PATH, kernelClass("DateRangePicker", "navIcon")));
    prevButton.addEventListener("click", () => {
      this.visibleMonth = addMonths(this.visibleMonth, -1);
      this.renderGrid();
    });

    this.headingEl = document.createElement("span");
    this.headingEl.id = `${this.baseId}-heading`;
    this.headingEl.className = kernelClass("DateRangePicker", "heading");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", this.builtInLabel("nextMonth", "Next month"));
    nextButton.className = kernelClass("DateRangePicker", "navButton");
    nextButton.append(arrowIcon(NEXT_PATH, kernelClass("DateRangePicker", "navIcon")));
    nextButton.addEventListener("click", () => {
      this.visibleMonth = addMonths(this.visibleMonth, 1);
      this.renderGrid();
    });

    header.append(prevButton, this.headingEl, nextButton);

    const table = document.createElement("table");
    table.setAttribute("role", "grid");
    table.className = kernelClass("DateRangePicker", "table");
    table.setAttribute("aria-labelledby", `${this.baseId}-heading`);

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of this.builtInLabelList("weekdays", WEEKDAY_LABELS)) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = kernelClass("DateRangePicker", "weekdayHead");
      th.textContent = label;
      headRow.append(th);
    }
    thead.append(headRow);

    this.tbodyEl = document.createElement("tbody");
    this.tbodyEl.addEventListener("keydown", (event) => this.handleGridKeyDown(event));

    table.append(thead, this.tbodyEl);
    root.append(header, table);

    this.native = root;
    this.append(root);
    this.renderGrid();
  }

  private selectDay(day: Date) {
    if (!isWithinRange(day, this.minDate, this.maxDate)) return;

    if (!this.from || this.to) {
      this.from = day;
      this.to = undefined;
    } else if (day < this.from) {
      this.from = day;
      this.to = undefined;
    } else {
      this.to = day;
    }

    this.renderGrid();
    this.dispatchEvent(
      new CustomEvent("valuechange", {
        detail: {
          from: this.from ? formatDateAttr(this.from) : undefined,
          to: this.to ? formatDateAttr(this.to) : undefined,
        },
        bubbles: true,
      }),
    );
  }

  private handleGridKeyDown(event: KeyboardEvent) {
    const cells = Array.from(
      this.tbodyEl.querySelectorAll<HTMLButtonElement>("button[data-day]:not(:disabled)"),
    );
    if (cells.length === 0) return;

    const currentIndex = cells.indexOf(document.activeElement as HTMLButtonElement);
    let nextIndex: number | null = null;

    switch (event.key) {
      case "ArrowRight":
        nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 1, cells.length - 1);
        break;
      case "ArrowLeft":
        nextIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 1, 0);
        break;
      case "ArrowDown":
        nextIndex = currentIndex === -1 ? 0 : Math.min(currentIndex + 7, cells.length - 1);
        break;
      case "ArrowUp":
        nextIndex = currentIndex === -1 ? 0 : Math.max(currentIndex - 7, 0);
        break;
      case "Home":
        nextIndex = weekEdgeIndex(cells, currentIndex, "start");
        break;
      case "End":
        nextIndex = weekEdgeIndex(cells, currentIndex, "end");
        break;
      default:
        return;
    }

    event.preventDefault();
    cells[nextIndex]?.focus();
  }

  protected applyLabels() {
    const root = this.native;
    if (!root) return;
    const [prev, next] = Array.from(root.querySelectorAll(`.${kernelClass("DateRangePicker", "navButton")}`));
    prev?.setAttribute("aria-label", this.builtInLabel("previousMonth", "Previous month"));
    next?.setAttribute("aria-label", this.builtInLabel("nextMonth", "Next month"));
    const weekdays = this.builtInLabelList("weekdays", WEEKDAY_LABELS);
    root.querySelectorAll(`.${kernelClass("DateRangePicker", "weekdayHead")}`).forEach((th, index) => {
      th.textContent = weekdays[index] ?? "";
    });
  }

  /** APG grid: the one Tab stop follows focus, so Tab back into the grid
   * returns to the day the arrow keys last reached. Updated in place: a
   * re-render would replace the button that just took focus. */
  private moveTabStop(button: HTMLButtonElement, day: Date) {
    this.focusedDay = day;
    for (const cell of Array.from(this.tbodyEl.querySelectorAll<HTMLButtonElement>("button[data-day]"))) {
      cell.tabIndex = cell === button ? 0 : -1;
    }
  }

  private renderGrid() {
    if (!this.headingEl || !this.tbodyEl) return;
    this.headingEl.textContent = MONTH_FORMATTER.format(this.visibleMonth);
    this.tbodyEl.replaceChildren();

    const today = startOfDay(new Date());
    const weeks = chunkIntoWeeks(getVisibleDays(this.visibleMonth));
    const { from } = this;
    const previewTo =
      from && !this.to && this.hoverDate && this.hoverDate > from ? this.hoverDate : undefined;
    const effectiveTo = this.to ?? previewTo;
    const tabStop = gridTabStop(this.visibleMonth, [this.focusedDay, from, this.to, today], this.minDate, this.maxDate);

    for (const week of weeks) {
      const tr = document.createElement("tr");
      for (const day of week) {
        const inCurrentMonth = day.getMonth() === this.visibleMonth.getMonth();
        const isToday = isSameDay(day, today);
        const disabled = !isWithinRange(day, this.minDate, this.maxDate);
        const isStart = from !== undefined && isSameDay(day, from);
        const isEnd = effectiveTo !== undefined && isSameDay(day, effectiveTo);
        const isInRange = from !== undefined && effectiveTo !== undefined && day > from && day < effectiveTo;
        const isSelected = isStart || isEnd;

        const td = document.createElement("td");
        td.className = kernelClass("DateRangePicker", "cell");
        // ARIA grid: aria-selected goes on the gridcell, not the button.
        td.setAttribute("role", "gridcell");
        const cellInRange = dataAttr(inCurrentMonth && isInRange);
        if (cellInRange) td.setAttribute("data-in-range", cellInRange);

        if (inCurrentMonth) {
          const button = document.createElement("button");
          button.type = "button";
          button.dataset.day = "";
          const startAttr = dataAttr(isStart);
          if (startAttr) button.setAttribute("data-range-start", startAttr);
          const endAttr = dataAttr(isEnd);
          if (endAttr) button.setAttribute("data-range-end", endAttr);
          const inRangeAttr = dataAttr(isInRange);
          if (inRangeAttr) button.setAttribute("data-in-range", inRangeAttr);
          const todayAttr = dataAttr(isToday);
          if (todayAttr) button.setAttribute("data-today", todayAttr);
          td.setAttribute("aria-selected", String(isSelected));
          if (isToday) button.setAttribute("aria-current", "date");
          button.disabled = disabled;
          button.tabIndex = tabStop !== undefined && isSameDay(day, tabStop) ? 0 : -1;
          button.className = kernelClass("DateRangePicker", "dayButton");
          button.textContent = String(day.getDate());
          button.addEventListener("click", () => {
            this.focusedDay = day;
            this.selectDay(day);
          });
          button.addEventListener("focus", () => this.moveTabStop(button, day));
          button.addEventListener("pointerenter", () => {
            this.hoverDate = day;
            this.renderGrid();
          });
          td.append(button);
        } else {
          const span = document.createElement("span");
          span.className = kernelClass("DateRangePicker", "outsideDay");
          span.setAttribute("aria-hidden", "true");
          span.textContent = String(day.getDate());
          td.append(span);
        }

        tr.append(td);
      }
      this.tbodyEl.append(tr);
    }
  }

  protected syncAttr(name: string) {
    if (!this.native) return;
    if (name === "value-from" || name === "value-to") {
      this.from = parseDateAttr(this.getAttribute("value-from"));
      this.to = parseDateAttr(this.getAttribute("value-to"));
      this.renderGrid();
    } else if (name === "min-date" || name === "max-date") {
      this.renderGrid();
    }
  }
}

customElements.define("kernel-date-range-picker", KernelDateRangePicker);
