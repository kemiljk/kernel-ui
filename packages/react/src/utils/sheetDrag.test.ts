import { describe, expect, it, vi } from "vitest";
import { attachSheetDrag, VelocityTracker, type SheetDragOptions } from "./sheetDrag";

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

describe("attachSheetDrag: dismissal", () => {
  function pointer(type: string, target: Element, clientY: number) {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientY, button: 0 });
    Object.defineProperties(event, { pointerId: { value: 1 }, pointerType: { value: "touch" } });
    target.dispatchEvent(event);
  }

  function setup(onDismiss: SheetDragOptions["onDismiss"]) {
    const node = document.createElement("div");
    const body = document.createElement("p");
    node.append(body);
    document.body.append(node);
    Object.defineProperty(node, "offsetHeight", { value: 400 });
    const onRelease = vi.fn();
    attachSheetDrag(node, () => ({
      side: "bottom",
      enabled: true,
      handleOnly: false,
      closeThreshold: 0.25,
      velocityThreshold: 10,
      handle: null,
      footer: null,
      snapPoints: [],
      snap: null,
      onDismiss,
      onRelease,
    }));
    // A slow drag most of the way down: past the distance threshold, under
    // the flick speed.
    pointer("pointerdown", body, 0);
    for (let y = 20; y <= 300; y += 20) pointer("pointermove", body, y);
    pointer("pointerup", body, 300);
    return { node, onRelease };
  }

  it("plays the exit when the dismissal goes ahead", () => {
    const onDismiss = vi.fn(() => true);
    const { node, onRelease } = setup(onDismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(node.style.translate).toBe("0 400px");
    expect(onRelease).toHaveBeenLastCalledWith(false);
  });

  it("settles back when the dismissal is refused (a cancelled close)", () => {
    const onDismiss = vi.fn(() => false);
    const { node, onRelease } = setup(onDismiss);
    expect(onDismiss).toHaveBeenCalledTimes(1);
    // Not left translated off-screen.
    expect(node.style.translate).toBe("");
    expect(onRelease).toHaveBeenLastCalledWith(true);
  });
});
