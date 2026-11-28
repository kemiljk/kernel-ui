/**
 * Arrow-key movement through a 2-D grid whose cells aren't a perfect,
 * fully enabled rectangle — a calendar month with `minDate`/`maxDate`
 * disabling some days, a short last row, or a gap.
 *
 * Index arithmetic (`± 1`, `± 7`) over the *enabled* cells only works when
 * nothing is skipped: drop one disabled day and ArrowDown lands a column
 * off, and `index % 7` stops meaning "column" as soon as the month doesn't
 * start on the first weekday. This works from each cell's real row and
 * column instead.
 *
 * - `left` / `right`: the previous/next enabled cell in reading order, so
 *   moving past a row's end continues on the next row (how a calendar
 *   reads: Saturday → the following Sunday).
 * - `up` / `down`: the nearest row in that direction that has any enabled
 *   cell; in it, the same column if enabled, otherwise the closest one.
 * - `row-start` / `row-end`: the first/last enabled cell in the same row.
 * - `first` / `last`: the first/last enabled cell anywhere.
 *
 * Returns the target index, or `from` when there's nowhere to go. Pure and
 * DOM-free; `gridDirectionForKey` maps a `KeyboardEvent` onto a direction.
 */
export interface SpatialCell {
  row: number;
  col: number;
  disabled?: boolean;
}

export type SpatialDirection = "up" | "down" | "left" | "right" | "row-start" | "row-end" | "first" | "last";

function readingOrder(a: SpatialCell, b: SpatialCell) {
  return a.row - b.row || a.col - b.col;
}

export function spatialMove(cells: readonly SpatialCell[], from: number, direction: SpatialDirection): number {
  const enabled = cells
    .map((cell, index) => ({ cell, index }))
    .filter(({ cell }) => !cell.disabled)
    .sort((a, b) => readingOrder(a.cell, b.cell));
  if (enabled.length === 0) return from;

  const origin = cells[from];
  if (!origin) {
    // Nothing focused yet: start at the first enabled cell.
    return direction === "last" || direction === "up" || direction === "left"
      ? enabled[enabled.length - 1]!.index
      : enabled[0]!.index;
  }

  switch (direction) {
    case "first":
      return enabled[0]!.index;
    case "last":
      return enabled[enabled.length - 1]!.index;
    case "left":
    case "right": {
      const step = direction === "right" ? 1 : -1;
      const ordered = direction === "right" ? enabled : [...enabled].reverse();
      const next = ordered.find(({ cell }) => readingOrder(cell, origin) * step > 0);
      return next ? next.index : from;
    }
    case "row-start":
    case "row-end": {
      const row = enabled.filter(({ cell }) => cell.row === origin.row);
      const target = direction === "row-start" ? row[0] : row[row.length - 1];
      return target ? target.index : from;
    }
    case "up":
    case "down": {
      const step = direction === "down" ? 1 : -1;
      let targetRow: number | null = null;
      for (const { cell } of enabled) {
        const distance = (cell.row - origin.row) * step;
        if (distance <= 0) continue;
        if (targetRow === null || distance < (targetRow - origin.row) * step) targetRow = cell.row;
      }
      if (targetRow === null) return from;
      let best: { cell: SpatialCell; index: number } | null = null;
      for (const entry of enabled) {
        if (entry.cell.row !== targetRow) continue;
        if (!best || Math.abs(entry.cell.col - origin.col) < Math.abs(best.cell.col - origin.col)) best = entry;
      }
      return best ? best.index : from;
    }
  }
}

/** Maps a key press onto a grid direction, or `null` for any other key.
 * Arrow Left/Right swap in a right-to-left layout, where the grid is
 * mirrored; Ctrl/Cmd + Home/End jump to the very first/last cell. */
export function gridDirectionForKey(
  event: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey">,
  rtl = false,
): SpatialDirection | null {
  switch (event.key) {
    case "ArrowUp":
      return "up";
    case "ArrowDown":
      return "down";
    case "ArrowLeft":
      return rtl ? "right" : "left";
    case "ArrowRight":
      return rtl ? "left" : "right";
    case "Home":
      return event.ctrlKey || event.metaKey ? "first" : "row-start";
    case "End":
      return event.ctrlKey || event.metaKey ? "last" : "row-end";
    default:
      return null;
  }
}

/** Row/column of a cell inside a real `<table>`, read from the DOM's own
 * `rowIndex`/`cellIndex` — what the calendar grids hand `spatialMove`. */
export function tableCellPosition(element: Element): { row: number; col: number } {
  const cell = element.closest("td, th") as HTMLTableCellElement | null;
  const row = cell?.parentElement as HTMLTableRowElement | null;
  return { row: row?.rowIndex ?? 0, col: cell?.cellIndex ?? 0 };
}
