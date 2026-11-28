import { describe, expect, it } from "vitest";
import { gridDirectionForKey, spatialMove, type SpatialCell } from "./spatialMove";

/** A month starting on Wednesday (col 3): days 1–30 laid out 7 per row. */
function month(disabled: (day: number) => boolean = () => false): Array<SpatialCell & { day: number }> {
  const cells: Array<SpatialCell & { day: number }> = [];
  for (let day = 1; day <= 30; day++) {
    const slot = day - 1 + 3;
    cells.push({ day, row: Math.floor(slot / 7), col: slot % 7, disabled: disabled(day) });
  }
  return cells;
}

const at = (cells: Array<{ day: number }>, day: number) => cells.findIndex((c) => c.day === day);

describe("spatialMove", () => {
  it("moves up/down by a week in a full grid", () => {
    const cells = month();
    expect(cells[spatialMove(cells, at(cells, 10), "down")]!.day).toBe(17);
    expect(cells[spatialMove(cells, at(cells, 10), "up")]!.day).toBe(3);
  });

  it("keeps the column when disabled days break index arithmetic", () => {
    // Days 1–7 disabled (minDate = 8th): ArrowUp from the 12th has no enabled
    // cell in its own column above, so it lands on the closest enabled one in
    // the nearest row, not seven enabled cells back.
    const cells = month((day) => day < 8);
    const target = cells[spatialMove(cells, at(cells, 12), "up")]!;
    expect(target.day).toBe(8);
    // ArrowDown with a disabled day in the way: same weekday a week on.
    const gaps = month((day) => day === 17);
    expect(gaps[spatialMove(gaps, at(gaps, 10), "down")]!.day).toBe(16);
  });

  it("wraps left/right through reading order, skipping disabled cells", () => {
    const cells = month((day) => day === 5);
    // Day 4 is the last day of its row (Saturday): right continues on day 5's
    // row, skipping the disabled 5th.
    expect(cells[spatialMove(cells, at(cells, 4), "right")]!.day).toBe(6);
    expect(cells[spatialMove(cells, at(cells, 6), "left")]!.day).toBe(4);
  });

  it("Home/End stay in the row; first/last span the grid", () => {
    const cells = month();
    // The 9th sits in the row that runs Sunday the 5th to Saturday the 11th.
    expect(cells[spatialMove(cells, at(cells, 9), "row-start")]!.day).toBe(5);
    expect(cells[spatialMove(cells, at(cells, 9), "row-end")]!.day).toBe(11);
    expect(cells[spatialMove(cells, at(cells, 9), "first")]!.day).toBe(1);
    expect(cells[spatialMove(cells, at(cells, 9), "last")]!.day).toBe(30);
  });

  it("stays put at an edge and starts at the first cell when nothing is focused", () => {
    const cells = month();
    expect(spatialMove(cells, at(cells, 30), "down")).toBe(at(cells, 30));
    expect(spatialMove(cells, -1, "down")).toBe(0);
  });

  it("handles ragged rows by choosing the closest column", () => {
    const cells: SpatialCell[] = [
      { row: 0, col: 0 },
      { row: 0, col: 1 },
      { row: 0, col: 2 },
      { row: 0, col: 3 },
      { row: 1, col: 0 },
    ];
    expect(spatialMove(cells, 3, "down")).toBe(4);
    expect(spatialMove(cells, 4, "up")).toBe(0);
  });
});

describe("gridDirectionForKey", () => {
  it("maps keys and mirrors left/right in RTL", () => {
    expect(gridDirectionForKey({ key: "ArrowLeft", ctrlKey: false, metaKey: false })).toBe("left");
    expect(gridDirectionForKey({ key: "ArrowLeft", ctrlKey: false, metaKey: false }, true)).toBe("right");
    expect(gridDirectionForKey({ key: "Home", ctrlKey: true, metaKey: false })).toBe("first");
    expect(gridDirectionForKey({ key: "a", ctrlKey: false, metaKey: false })).toBeNull();
  });
});
