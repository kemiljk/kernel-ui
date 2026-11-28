import { useId, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { dataAttr } from "../../utils/polymorphic";
import { inputModality, type ChangeDetails } from "../../utils/changeDetails";
import { gridDirectionForKey, spatialMove, tableCellPosition } from "../../utils/spatialMove";
import { useControllableStateWithDetails } from "../../utils/useControllableState";
import {
  addMonths,
  chunkIntoWeeks,
  getVisibleDays,
  isSameDay,
  isWithinRange,
  startOfDay,
} from "../../utils/dateGrid";
import styles from "./DatePicker.module.css";

/** Built-in strings, overridable for translation via `labels`. */
export interface DatePickerLabels {
  /** Accessible name of the previous-month button. Default `"Previous month"`. */
  previousMonth: string;
  /** Accessible name of the next-month button. Default `"Next month"`. */
  nextMonth: string;
  /** Column headers, Sunday first. Default `["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]`. */
  weekdays: readonly string[];
}

const defaultDatePickerLabels: DatePickerLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
};
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

/** What picked a day: a click or tap on it, or Space/Enter on the focused day. */
export type DatePickerChangeReason = "day-press" | "keyboard";

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  /** Called before the selection moves, with the reason (`"day-press"` or `"keyboard"`); `details.cancel()`
   * keeps the current day selected. */
  onValueChange?: (date: Date, details: ChangeDetails<DatePickerChangeReason>) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<DatePickerLabels>;
}

/**
 * The real WAI-ARIA "grid" pattern applied to an actual `<table>`: rows
 * are weeks, columns are days of the week, exactly what a calendar month
 * already is, so no `role` overrides are needed on the table itself.
 * Days outside the displayed month render as dimmed, non-interactive
 * text rather than disabled buttons, since they're not really "this
 * month's grid, minus some options" the way a disabled `minDate`/
 * `maxDate` day is, they're a different month's day shown for layout.
 *
 * Keyboard support moves focus within the days currently rendered in
 * the grid (arrow keys clamp at the first/last visible cell rather than
 * paging to the adjacent month automatically); crossing a month
 * boundary requires the Previous/Next month buttons. Extending arrow
 * navigation to auto-page months is a reasonable follow-up, not done
 * here to keep focus management simple and predictable.
 */
export function DatePicker({ value, defaultValue, onValueChange, minDate, maxDate, labels }: DatePickerProps) {
  const l = { ...defaultDatePickerLabels, ...labels };
  const [selected, setSelected] = useControllableStateWithDetails<Date | undefined, DatePickerChangeReason>({
    value,
    defaultValue,
    onChange: onValueChange as (value: Date | undefined, details: ChangeDetails<DatePickerChangeReason>) => void,
  });

  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(selected ?? new Date()));
  const today = startOfDay(new Date());
  const gridRef = useRef<HTMLTableSectionElement>(null);
  const baseId = useId();

  const weeks = chunkIntoWeeks(getVisibleDays(visibleMonth));

  function goToPreviousMonth() {
    setVisibleMonth((month) => addMonths(month, -1));
  }

  function goToNextMonth() {
    setVisibleMonth((month) => addMonths(month, 1));
  }

  function selectDay(day: Date, event: MouseEvent<HTMLButtonElement>) {
    if (!isWithinRange(day, minDate, maxDate)) return;
    setSelected(day, inputModality(event) === "keyboard" ? "keyboard" : "day-press", event);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    const grid = gridRef.current;
    const cells = Array.from(grid?.querySelectorAll<HTMLButtonElement>("button[data-day]") ?? []);
    if (!grid || cells.length === 0) return;
    const direction = gridDirectionForKey(event, getComputedStyle(grid).direction === "rtl");
    if (!direction) return;
    event.preventDefault();
    // Real row/column positions, not index arithmetic over enabled days —
    // see `spatialMove` for why ± 7 lands a column off once a day is disabled.
    const next = spatialMove(
      cells.map((cell) => ({ ...tableCellPosition(cell), disabled: cell.disabled })),
      cells.indexOf(document.activeElement as HTMLButtonElement),
      direction,
    );
    cells[next]?.focus();
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button
          type="button"
          aria-label={l.previousMonth}
          className={styles.navButton}
          onClick={goToPreviousMonth}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" data-icon-directional="" className={styles.navIcon}>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span id={`${baseId}-heading`} className={styles.heading}>
          {MONTH_FORMATTER.format(visibleMonth)}
        </span>
        <button
          type="button"
          aria-label={l.nextMonth}
          className={styles.navButton}
          onClick={goToNextMonth}
        >
          <svg viewBox="0 0 16 16" width="16" height="16" fill="none" aria-hidden="true" data-icon-directional="" className={styles.navIcon}>
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <table className={styles.table} role="grid" aria-labelledby={`${baseId}-heading`}>
        <thead>
          <tr>
            {l.weekdays.map((label, index) => (
              <th key={index} scope="col" className={styles.weekdayHead}>
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody ref={gridRef} onKeyDown={handleGridKeyDown}>
          {weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day) => {
                const inCurrentMonth = day.getMonth() === visibleMonth.getMonth();
                const isSelected = selected !== undefined && isSameDay(day, selected);
                const isToday = isSameDay(day, today);
                const disabled = !isWithinRange(day, minDate, maxDate);

                return (
                  // ARIA grid: aria-selected belongs on the gridcell, not the
                  // button inside it (ARIA doesn't allow it on a button).
                  <td
                    key={day.toISOString()}
                    className={styles.cell}
                    role="gridcell"
                    aria-selected={inCurrentMonth ? isSelected : undefined}
                  >
                    {inCurrentMonth ? (
                      <button
                        type="button"
                        data-day=""
                        data-selected={dataAttr(isSelected)}
                        data-today={dataAttr(isToday)}
                        aria-current={isToday ? "date" : undefined}
                        disabled={disabled}
                        tabIndex={isSelected || (!selected && isToday) ? 0 : -1}
                        className={styles.dayButton}
                        onClick={(event) => selectDay(day, event)}
                      >
                        {day.getDate()}
                      </button>
                    ) : (
                      <span className={styles.outsideDay} aria-hidden="true">
                        {day.getDate()}
                      </span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
