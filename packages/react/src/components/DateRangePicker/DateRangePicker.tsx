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
  gridTabStop,
} from "../../utils/dateGrid";
import styles from "./DateRangePicker.module.css";

/** Built-in strings, overridable for translation via `labels`. */
export interface DateRangePickerLabels {
  /** Accessible name of the previous-month button. Default `"Previous month"`. */
  previousMonth: string;
  /** Accessible name of the next-month button. Default `"Next month"`. */
  nextMonth: string;
  /** Column headers, Sunday first. Default `["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]`. */
  weekdays: readonly string[];
}

const defaultDateRangePickerLabels: DateRangePickerLabels = {
  previousMonth: "Previous month",
  nextMonth: "Next month",
  weekdays: ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"],
};
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export interface DateRange {
  from?: Date;
  to?: Date;
}

/** What picked a range endpoint: a click or tap on a day, or Space/Enter on
 * the focused day. */
export type DateRangePickerChangeReason = "day-press" | "keyboard";

export interface DateRangePickerProps {
  value?: DateRange;
  /** Defaults to `{}` (no range selected). */
  defaultValue?: DateRange;
  /** Called before the range changes, with the reason (`"day-press"` or `"keyboard"`); `details.cancel()`
   * keeps the current range. */
  onValueChange?: (range: DateRange, details: ChangeDetails<DateRangePickerChangeReason>) => void;
  minDate?: Date;
  maxDate?: Date;
  /** Override built-in strings (e.g. for translation); unset keys keep
   * their English default. */
  labels?: Partial<DateRangePickerLabels>;
}

/**
 * Same table-grid markup and month navigation as DatePicker, but tracking
 * two endpoints instead of one. A click either starts a fresh range or
 * completes the open one: once both ends are set, the next click starts
 * over, matching how most range pickers treat a third click.
 *
 * The in-progress second half of a range (before it's actually clicked)
 * is a hover preview only, `hoverDate` never reaches `onValueChange`.
 */
export function DateRangePicker({ value, defaultValue, onValueChange, minDate, maxDate, labels }: DateRangePickerProps) {
  const l = { ...defaultDateRangePickerLabels, ...labels };
  const [range, setRange] = useControllableStateWithDetails<DateRange, DateRangePickerChangeReason>({
    value,
    defaultValue: defaultValue ?? {},
    onChange: onValueChange,
  });

  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(range.from ?? new Date()));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
  // APG grid: the one Tab stop follows focus, so Tab back into the grid
  // returns to the day the arrow keys last reached.
  const [focusedDay, setFocusedDay] = useState<Date>();
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
    const reason = inputModality(event) === "keyboard" ? "keyboard" : "day-press";

    const { from, to } = range;
    if (!from || to) {
      setRange({ from: day, to: undefined }, reason, event);
      return;
    }

    if (day < from) {
      setRange({ from: day, to: undefined }, reason, event);
      return;
    }

    setRange({ from, to: day }, reason, event);
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

  const { from, to } = range;
  // While an end isn't picked yet, the hovered day previews it, clamped
  // so hovering backwards over `from` can't preview a negative-length range.
  const previewTo = from && !to && hoverDate && hoverDate > from ? hoverDate : undefined;
  const effectiveTo = to ?? previewTo;
  const tabStop = gridTabStop(visibleMonth, [focusedDay, from, to, today], minDate, maxDate);

  return (
    <div className={styles.root} onPointerLeave={() => setHoverDate(null)}>
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
                const isToday = isSameDay(day, today);
                const disabled = !isWithinRange(day, minDate, maxDate);

                const isStart = from !== undefined && isSameDay(day, from);
                const isEnd = effectiveTo !== undefined && isSameDay(day, effectiveTo);
                const isInRange =
                  from !== undefined &&
                  effectiveTo !== undefined &&
                  day > from &&
                  day < effectiveTo;
                const isSelected = isStart || isEnd;

                return (
                  // ARIA grid: aria-selected belongs on the gridcell, not the
                  // button inside it (ARIA doesn't allow it on a button).
                  <td
                    key={day.toISOString()}
                    className={styles.cell}
                    role="gridcell"
                    aria-selected={inCurrentMonth ? isSelected : undefined}
                    data-in-range={dataAttr(inCurrentMonth && isInRange)}
                  >
                    {inCurrentMonth ? (
                      <button
                        type="button"
                        data-day=""
                        data-range-start={dataAttr(isStart)}
                        data-range-end={dataAttr(isEnd)}
                        data-in-range={dataAttr(isInRange)}
                        data-today={dataAttr(isToday)}
                        aria-current={isToday ? "date" : undefined}
                        disabled={disabled}
                        tabIndex={tabStop !== undefined && isSameDay(day, tabStop) ? 0 : -1}
                        className={styles.dayButton}
                        onClick={(event) => {
                          setFocusedDay(day);
                          selectDay(day, event);
                        }}
                        onFocus={() => setFocusedDay(day)}
                        onPointerEnter={() => setHoverDate(day)}
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
