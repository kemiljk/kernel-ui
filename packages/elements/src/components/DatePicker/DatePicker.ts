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
} from "../../utils/dateGrid";
import "./DatePicker.css";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });
const PREV_PATH = "M10 3L5 8L10 13";
const NEXT_PATH = "M6 3L11 8L6 13";

function arrowIcon(path: string, className: string): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", className);
  const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
  p.setAttribute("d", path);
  p.setAttribute("stroke", "currentColor");
  p.setAttribute("stroke-width", "1.5");
  p.setAttribute("stroke-linecap", "round");
  p.setAttribute("stroke-linejoin", "round");
  svg.append(p);
  return svg;
}

let datePickerCounter = 0;

/**
 * `<kernel-date-picker>` — the real WAI-ARIA "grid" pattern applied to
 * an actual `<table>`: rows are weeks, columns are days of the week.
 * Days outside the displayed month render as dimmed, non-interactive
 * text, not disabled buttons — they're a different month's day shown
 * for layout, not "this month's grid, minus some options".
 *
 * Keyboard support moves focus within the days currently rendered in
 * the grid (arrow keys clamp at the grid's edges rather than
 * auto-paging to the adjacent month); crossing a month boundary
 * requires the Previous/Next month buttons.
 *
 * Attributes: `value`, `min-date`, `max-date` — all `YYYY-MM-DD`.
 * Events: `valuechange` (`event.detail.value`, a `YYYY-MM-DD` string).
 */
export class KernelDatePicker extends KernelElement {
  private readonly baseId = `kernel-date-picker-${++datePickerCounter}`;
  private selected: Date | undefined;
  private visibleMonth: Date;
  private headingEl!: HTMLElement;
  private tbodyEl!: HTMLTableSectionElement;

  static get observedAttributes() {
    return ["value", "min-date", "max-date"];
  }

  constructor() {
    super();
    this.visibleMonth = startOfDay(new Date());
  }

  get minDate(): Date | undefined {
    return parseDateAttr(this.getAttribute("min-date"));
  }

  get maxDate(): Date | undefined {
    return parseDateAttr(this.getAttribute("max-date"));
  }

  connectedCallback() {
    if (this.native) return;

    this.selected = parseDateAttr(this.getAttribute("value"));
    this.visibleMonth = startOfDay(this.selected ?? new Date());

    const root = document.createElement("div");
    root.className = kernelClass("DatePicker");

    const header = document.createElement("div");
    header.className = kernelClass("DatePicker", "header");

    const prevButton = document.createElement("button");
    prevButton.type = "button";
    prevButton.setAttribute("aria-label", "Previous month");
    prevButton.className = kernelClass("DatePicker", "navButton");
    prevButton.append(arrowIcon(PREV_PATH, kernelClass("DatePicker", "navIcon")));
    prevButton.addEventListener("click", () => {
      this.visibleMonth = addMonths(this.visibleMonth, -1);
      this.renderGrid();
    });

    this.headingEl = document.createElement("span");
    this.headingEl.id = `${this.baseId}-heading`;
    this.headingEl.className = kernelClass("DatePicker", "heading");

    const nextButton = document.createElement("button");
    nextButton.type = "button";
    nextButton.setAttribute("aria-label", "Next month");
    nextButton.className = kernelClass("DatePicker", "navButton");
    nextButton.append(arrowIcon(NEXT_PATH, kernelClass("DatePicker", "navIcon")));
    nextButton.addEventListener("click", () => {
      this.visibleMonth = addMonths(this.visibleMonth, 1);
      this.renderGrid();
    });

    header.append(prevButton, this.headingEl, nextButton);

    const table = document.createElement("table");
    table.className = kernelClass("DatePicker", "table");
    table.setAttribute("aria-labelledby", `${this.baseId}-heading`);

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    for (const label of WEEKDAY_LABELS) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = kernelClass("DatePicker", "weekdayHead");
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
    this.selected = day;
    this.renderGrid();
    this.dispatchEvent(
      new CustomEvent("valuechange", { detail: { value: formatDateAttr(day) }, bubbles: true }),
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
      case "Home": {
        const weekStart = currentIndex === -1 ? 0 : currentIndex - (currentIndex % 7);
        nextIndex = weekStart;
        break;
      }
      case "End": {
        const weekStart = currentIndex === -1 ? 0 : currentIndex - (currentIndex % 7);
        nextIndex = Math.min(weekStart + 6, cells.length - 1);
        break;
      }
      default:
        return;
    }

    event.preventDefault();
    cells[nextIndex]?.focus();
  }

  private renderGrid() {
    if (!this.headingEl || !this.tbodyEl) return;
    this.headingEl.textContent = MONTH_FORMATTER.format(this.visibleMonth);
    this.tbodyEl.replaceChildren();

    const today = startOfDay(new Date());
    const weeks = chunkIntoWeeks(getVisibleDays(this.visibleMonth));

    for (const week of weeks) {
      const tr = document.createElement("tr");
      for (const day of week) {
        const td = document.createElement("td");
        td.className = kernelClass("DatePicker", "cell");
        const inCurrentMonth = day.getMonth() === this.visibleMonth.getMonth();

        if (inCurrentMonth) {
          const isSelected = this.selected !== undefined && isSameDay(day, this.selected);
          const isToday = isSameDay(day, today);
          const disabled = !isWithinRange(day, this.minDate, this.maxDate);

          const button = document.createElement("button");
          button.type = "button";
          button.dataset.day = "";
          const selectedAttr = dataAttr(isSelected);
          if (selectedAttr) button.setAttribute("data-selected", selectedAttr);
          const todayAttr = dataAttr(isToday);
          if (todayAttr) button.setAttribute("data-today", todayAttr);
          button.setAttribute("aria-selected", String(isSelected));
          button.disabled = disabled;
          button.tabIndex = isSelected || (!this.selected && isToday) ? 0 : -1;
          button.className = kernelClass("DatePicker", "dayButton");
          button.textContent = String(day.getDate());
          button.addEventListener("click", () => this.selectDay(day));
          td.append(button);
        } else {
          const span = document.createElement("span");
          span.className = kernelClass("DatePicker", "outsideDay");
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
    if (name === "value") {
      this.selected = parseDateAttr(this.getAttribute("value"));
      this.renderGrid();
    } else if (name === "min-date" || name === "max-date") {
      this.renderGrid();
    }
  }
}

customElements.define("kernel-date-picker", KernelDatePicker);
