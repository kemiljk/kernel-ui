import { describe, expect, it } from "vitest";
import { damp, FLICK_VELOCITY, rubberBand, shouldDismiss } from "./gesture";

describe("shouldDismiss", () => {
  const base = { extent: 200, closeThreshold: 0.25 };

  it("dismisses on distance past the threshold", () => {
    expect(shouldDismiss({ ...base, travel: 60, velocity: 0 })).toBe(true);
    expect(shouldDismiss({ ...base, travel: 40, velocity: 0 })).toBe(false);
  });

  it("dismisses a short flick on velocity alone", () => {
    expect(shouldDismiss({ ...base, travel: 10, velocity: FLICK_VELOCITY + 0.01 })).toBe(true);
  });

  it("refuses a distance dismissal while the pointer is pulling back", () => {
    expect(shouldDismiss({ ...base, travel: 150, velocity: -0.2 })).toBe(false);
  });

  it("never dismisses travel away from the edge", () => {
    expect(shouldDismiss({ ...base, travel: -150, velocity: 5 })).toBe(false);
  });
});

describe("rubberBand", () => {
  it("is one-to-one toward dismissal and damped the other way", () => {
    expect(rubberBand(80, 200)).toBe(80);
    const pulled = rubberBand(-80, 200);
    expect(pulled).toBeLessThan(0);
    expect(Math.abs(pulled)).toBeLessThan(80 * 0.55);
    expect(damp(1e6, 200)).toBeLessThan(200);
  });
});
