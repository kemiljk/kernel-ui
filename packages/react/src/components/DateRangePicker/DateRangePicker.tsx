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
import styles from "./DateRangePicker.module.css";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" });

export interface DateRange {
  from?: Date;
  to?: Date;
}

export interface DateRangePickerProps {
  value?: DateRange;
  defaultValue?: DateRange;
  onValueChange?: (range: DateRange) => void;
  minDate?: Date;
  maxDate?: Date;
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
export function DateRangePicker({ value, defaultValue, onValueChange, minDate, maxDate }: DateRangePickerProps) {
  const [range, setRange] = useControllableState<DateRange>({
    value,
    defaultValue: defaultValue ?? {},
    onChange: onValueChange,
  });

  const [visibleMonth, setVisibleMonth] = useState(() => startOfDay(range.from ?? new Date()));
  const [hoverDate, setHoverDate] = useState<Date | null>(null);
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

    const { from, to } = range;
    if (!from || to) {
      setRange({ from: day, to: undefined });
      return;
    }

    if (day < from) {
      setRange({ from: day, to: undefined });
      return;
    }

    setRange({ from, to: day });
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

  const { from, to } = range;
  // While an end isn't picked yet, the hovered day previews it, clamped
  // so hovering backwards over `from` can't preview a negative-length range.
  const previewTo = from && !to && hoverDate && hoverDate > from ? hoverDate : undefined;
  const effectiveTo = to ?? previewTo;

  return (
    <div className={styles.root} onPointerLeave={() => setHoverDate(null)}>
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
                  <td
                    key={day.toISOString()}
                    className={styles.cell}
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
                        aria-selected={isSelected}
                        disabled={disabled}
                        tabIndex={isSelected || (!from && isToday) ? 0 : -1}
                        className={styles.dayButton}
                        onClick={() => selectDay(day)}
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
