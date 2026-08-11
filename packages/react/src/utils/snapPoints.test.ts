import { describe, expect, it } from "vitest";
import { parseSnapPoints, resolveSnapTarget, snapsToPx } from "./snapPoints";

const FLICK = 0.5;

describe("parseSnapPoints", () => {
  it("takes an array or an attribute string", () => {
    expect(parseSnapPoints([40, 70, 100])).toEqual([40, 70, 100]);
    expect(parseSnapPoints("40,70,100")).toEqual([40, 70, 100]);
    expect(parseSnapPoints("25 55  92")).toEqual([25, 55, 92]);
  });

  it("sorts and dedupes, so authoring order doesn't matter", () => {
    expect(parseSnapPoints("70,40,70")).toEqual([40, 70]);
  });

  it("drops anything outside 0–100 or unparseable rather than throwing", () => {
    // A typo shouldn't take the sheet down with it.
    expect(parseSnapPoints("40,abc,-10,0,140,60")).toEqual([40, 60]);
  });

  it("treats nothing as a binary sheet", () => {
    expect(parseSnapPoints(null)).toEqual([]);
    expect(parseSnapPoints(undefined)).toEqual([]);
    expect(parseSnapPoints("")).toEqual([]);
    expect(parseSnapPoints([])).toEqual([]);
  });
});

describe("resolveSnapTarget", () => {
  const snapsPx = snapsToPx([40, 70, 100], 1000); // [400, 700, 1000]

  it("lands on the nearest snap when released slowly", () => {
    expect(resolveSnapTarget({ currentPx: 450, velocityY: 0, snapsPx, flickVelocity: FLICK })).toBe(400);
    expect(resolveSnapTarget({ currentPx: 620, velocityY: 0, snapsPx, flickVelocity: FLICK })).toBe(700);
  });

  it("steps exactly one snap on a flick, not to the nearest", () => {
    // Sitting at 420 — nearest is 400 — but flicked upward, so it goes to 700.
    expect(resolveSnapTarget({ currentPx: 420, velocityY: -2, snapsPx, flickVelocity: FLICK })).toBe(700);
    // And downward from just under the top, to the one below rather than the floor.
    expect(resolveSnapTarget({ currentPx: 980, velocityY: 2, snapsPx, flickVelocity: FLICK })).toBe(700);
  });

  it("steps from where the finger is, not from the snap it started on", () => {
    // Dragged well past the top snap, then flicked up: it must not target 700.
    expect(resolveSnapTarget({ currentPx: 1100, velocityY: -2, snapsPx, flickVelocity: FLICK })).toBe(1000);
  });

  it("dismisses when a downward flick runs out of snaps below", () => {
    expect(resolveSnapTarget({ currentPx: 400, velocityY: 2, snapsPx, flickVelocity: FLICK })).toBeNull();
    expect(resolveSnapTarget({ currentPx: 200, velocityY: 2, snapsPx, flickVelocity: FLICK })).toBeNull();
  });

  it("clamps an upward flick at the tallest snap", () => {
    expect(resolveSnapTarget({ currentPx: 1000, velocityY: -2, snapsPx, flickVelocity: FLICK })).toBe(1000);
  });

  it("does not resolve a flick to the snap it is already sitting on", () => {
    // Exactly on 700 and flicked up: the epsilon is what stops this returning
    // 700 again and looking like the sheet ignored the gesture.
    expect(resolveSnapTarget({ currentPx: 700, velocityY: -2, snapsPx, flickVelocity: FLICK })).toBe(1000);
    expect(resolveSnapTarget({ currentPx: 700, velocityY: 2, snapsPx, flickVelocity: FLICK })).toBe(400);
  });

  it("has nowhere to land without snaps", () => {
    expect(resolveSnapTarget({ currentPx: 500, velocityY: 0, snapsPx: [], flickVelocity: FLICK })).toBeNull();
  });
});
