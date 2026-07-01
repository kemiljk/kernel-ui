import { useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { dataAttr } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import {
  addMonths,
  chunkIntoWeeks,
  getVisibleDays,
  isSameDay,
  isWithinRange,
  startOfDay,
} from "../../utils/dateGrid";
import styles from "./DatePicker.module.css";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export interface DatePickerProps {
  value?: Date;
  defaultValue?: Date;
  onValueChange?: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
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
export function DatePicker({ value, defaultValue, onValueChange, minDate, maxDate }: DatePickerProps) {
  const [selected, setSelected] = useControllableState<Date | undefined>({
    value,
    defaultValue,
    onChange: onValueChange as (value: Date | undefined) => void,
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

  function selectDay(day: Date) {
    if (!isWithinRange(day, minDate, maxDate)) return;
    setSelected(day);
  }

  function handleGridKeyDown(event: KeyboardEvent<HTMLTableSectionElement>) {
    const cells = Array.from(
      gridRef.current?.querySelectorAll<HTMLButtonElement>("button[data-day]:not(:disabled)") ?? [],
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

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <button
          type="button"
          aria-label="Previous month"
          className={styles.navButton}
          onClick={goToPreviousMonth}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.navIcon}>
            <path d="M10 3L5 8L10 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <span id={`${baseId}-heading`} className={styles.heading}>
          {MONTH_FORMATTER.format(visibleMonth)}
        </span>
        <button
          type="button"
          aria-label="Next month"
          className={styles.navButton}
          onClick={goToNextMonth}
        >
          <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={styles.navIcon}>
            <path d="M6 3L11 8L6 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <table className={styles.table} aria-labelledby={`${baseId}-heading`}>
        <thead>
          <tr>
            {WEEKDAY_LABELS.map((label, index) => (
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
                  <td key={day.toISOString()} className={styles.cell}>
                    {inCurrentMonth ? (
                      <button
                        type="button"
                        data-day=""
                        data-selected={dataAttr(isSelected)}
                        data-today={dataAttr(isToday)}
                        aria-selected={isSelected}
                        disabled={disabled}
                        tabIndex={isSelected || (!selected && isToday) ? 0 : -1}
                        className={styles.dayButton}
                        onClick={() => selectDay(day)}
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
