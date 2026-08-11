import { describe, expect, it } from "vitest";
import { VelocityTracker } from "./sheetDrag";

/** Samples are fed as travel along the dismiss axis, already signed, so a
 * positive reading always means "toward dismissal". */
function track(samples: [coord: number, time: number][]) {
  const tracker = new VelocityTracker();
  for (const [coord, time] of samples) tracker.add(coord, time);
  return tracker.velocity;
}

describe("VelocityTracker", () => {
  it("needs two samples before it reports anything", () => {
    expect(track([[0, 0]])).toBe(0);
  });

  it("reports the recent rate, not the whole gesture's average", () => {
    // 100px over the first 400ms, then 100px over the last 50ms. A whole-gesture
    // average would call this 0.44px/ms; only the tail is a flick.
    const velocity = track([
      [0, 0],
      [100, 400],
      [150, 425],
      [200, 450],
    ]);
    expect(velocity).toBeCloseTo(2, 5);
  });

  it("decays to zero for a finger that stopped before releasing", () => {
    // The move that mattered is outside the window by the time of release, and
    // the release itself is the final sample.
    expect(
      track([
        [0, 0],
        [200, 40],
        [200, 300],
      ]),
    ).toBe(0);
  });

  it("reports the direction after a reversal, not the one it came from", () => {
    // Pulled 300 down, then hauled 140 back up. Averaging the window would
    // still read downward and send the sheet away from the finger.
    const velocity = track([
      [0, 0],
      [300, 60],
      [200, 80],
      [160, 100],
    ]);
    expect(velocity).toBeLessThan(0);
    expect(velocity).toBeCloseTo((160 - 300) / 40, 5);
  });

  it("treats a stalled sample as part of the same direction, not a turn", () => {
    // A slow drag quantises to zero-length steps constantly; counting them as
    // reversals would zero out every deliberate slow flick.
    const velocity = track([
      [0, 0],
      [20, 20],
      [20, 40],
      [40, 60],
    ]);
    expect(velocity).toBeCloseTo(40 / 60, 5);
  });

  it("forgets samples older than the window", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(50, 50);
    tracker.add(100, 500);
    tracker.add(120, 520);
    // The 0 and 50 samples aged out, so this is the 100 → 120 leg alone.
    expect(tracker.velocity).toBeCloseTo(1, 5);
  });

  it("resets", () => {
    const tracker = new VelocityTracker();
    tracker.add(0, 0);
    tracker.add(100, 50);
    tracker.reset();
    expect(tracker.velocity).toBe(0);
  });
});
