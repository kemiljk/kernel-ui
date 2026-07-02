/** Pure date-math helpers for rendering a calendar month as a 7-column
 * grid, shared by every component that renders a month table (DatePicker,
 * DateRangePicker). No component state or React lives here. */

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isWithinRange(date: Date, minDate: Date | undefined, maxDate: Date | undefined): boolean {
  if (minDate && date < startOfDay(minDate)) return false;
  if (maxDate && date > startOfDay(maxDate)) return false;
  return true;
}

export function addMonths(date: Date, amount: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

/** Every cell rendered in the grid, including the leading/trailing days
 * that pad the first and last week out to full weeks: a real calendar
 * grid is always a whole number of 7-day rows, there's no such thing as
 * a partial week in the layout. */
export function getVisibleDays(month: Date): Date[] {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const firstOfMonth = new Date(year, monthIndex, 1);
  const lastOfMonth = new Date(year, monthIndex + 1, 0);

  const days: Date[] = [];
  for (let i = 0; i < firstOfMonth.getDay(); i++) {
    days.push(new Date(year, monthIndex, i - firstOfMonth.getDay() + 1));
  }
  for (let date = 1; date <= lastOfMonth.getDate(); date++) {
    days.push(new Date(year, monthIndex, date));
  }
  while (days.length % 7 !== 0) {
    days.push(new Date(year, monthIndex + 1, days.length - lastOfMonth.getDate() - firstOfMonth.getDay() + 1));
  }
  return days;
}

export function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Parses a `YYYY-MM-DD` attribute value as a local date (not UTC —
 * `new Date("2026-07-15")` parses as UTC midnight, which shifts a day
 * back in any timezone west of UTC). Returns `undefined` for anything
 * that doesn't match. */
export function parseDateAttr(value: string | null): Date | undefined {
  if (!value) return undefined;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

/** The inverse of `parseDateAttr` — formats a `Date` back to
 * `YYYY-MM-DD` in local time. */
export function formatDateAttr(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
