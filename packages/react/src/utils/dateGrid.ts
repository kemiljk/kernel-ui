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

/** The one day in `month` that holds the calendar grid's Tab stop (the APG
 * grid pattern: exactly one cell has tabindex="0"): the first of
 * `preferred` that's in the month and enabled, else the month's first
 * enabled day. Without the fallback, a month showing neither the selection
 * nor today had no Tab stop at all, so keyboard users couldn't reach its
 * days; and a range with both ends in view had two. */
export function gridTabStop(
  month: Date,
  preferred: (Date | undefined)[],
  minDate: Date | undefined,
  maxDate: Date | undefined,
): Date | undefined {
  const inMonth = (date: Date) => date.getFullYear() === month.getFullYear() && date.getMonth() === month.getMonth();
  for (const date of preferred) {
    if (date && inMonth(date) && isWithinRange(startOfDay(date), minDate, maxDate)) return startOfDay(date);
  }
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  for (let day = 1; day <= last; day++) {
    const date = new Date(month.getFullYear(), month.getMonth(), day);
    if (isWithinRange(date, minDate, maxDate)) return date;
  }
  return undefined;
}
