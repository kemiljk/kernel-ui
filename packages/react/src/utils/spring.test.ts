import { describe, expect, it } from "vitest";
import { DEFAULT_SPRING, normalizeSpring, parseSpring, runSpring } from "./spring";

/**
 * Drives a spring with a clock and a frame scheduler we control, which is the
 * only way to assert the thing this implementation exists for: that the path
 * depends on elapsed time alone, not on when the frames happened to land.
 */
function sample(options: {
  from: number;
  to: number;
  velocity?: number;
  stepMs: number;
  config?: { attraction: number; friction: number };
  maxFrames?: number;
}) {
  const { from, to, velocity = 0, stepMs, config, maxFrames = 2000 } = options;
  let t = 0;
  const values: { at: number; value: number }[] = [];
  let done = false;
  // Typed through a holder: TypeScript narrows a plain `let` to `never` inside
  // the loop below, since every assignment it can see sets it to null.
  const frame: { pending: ((time: number) => void) | null } = { pending: null };

  const cancel = runSpring({
    from,
    to,
    velocity,
    config,
    onFrame: (value) => values.push({ at: t, value }),
    onDone: () => {
      done = true;
    },
    raf: (cb) => {
      frame.pending = cb;
      return 1;
    },
    cancelRaf: () => {
      frame.pending = null;
    },
    now: () => t,
  });

  for (let i = 0; i < maxFrames && frame.pending && !done; i++) {
    const cb = frame.pending;
    frame.pending = null;
    t += stepMs;
    cb(t);
  }
  return { values, done, cancel };
}

describe("normalizeSpring / parseSpring", () => {
  it("falls back per field rather than rejecting the whole config", () => {
    expect(normalizeSpring({ attraction: 0.2, friction: 5 })).toEqual({
      attraction: 0.2,
      friction: DEFAULT_SPRING.friction,
    });
    expect(normalizeSpring(null)).toEqual(DEFAULT_SPRING);
  });

  it("reads the attribute form", () => {
    expect(parseSpring("0.2,0.5")).toEqual({ attraction: 0.2, friction: 0.5 });
    expect(parseSpring("")).toEqual(DEFAULT_SPRING);
    expect(parseSpring("nonsense")).toEqual(DEFAULT_SPRING);
  });
});

describe("runSpring", () => {
  it("is at the start when no time has passed, and finishes on the target exactly", () => {
    // Sampled at a hair past zero, because rAF's first callback is genuinely a
    // frame in and the value has legitimately begun moving by then.
    const opening = sample({ from: 800, to: 400, stepMs: 0.001, maxFrames: 1 });
    expect(opening.values[0]!.value).toBeCloseTo(800, 3);

    const { values, done } = sample({ from: 800, to: 400, stepMs: 16 });
    expect(done).toBe(true);
    expect(values[values.length - 1]!.value).toBe(400);
  });

  it("leaves at the velocity it was given", () => {
    // Already on target but still moving: it must carry past and come back,
    // which is the whole reason a release velocity is worth threading through.
    const up = sample({ from: 400, to: 400, velocity: 2, stepMs: 8 });
    expect(up.values[0]!.value).toBeGreaterThan(400);

    const down = sample({ from: 400, to: 400, velocity: -2, stepMs: 8 });
    expect(down.values[0]!.value).toBeLessThan(400);
  });

  it("follows the same path regardless of frame rate", () => {
    // The property the closed form exists to guarantee. A per-frame integrator
    // fails this: 120Hz and 30Hz would take measurably different routes.
    const fast = sample({ from: 800, to: 400, velocity: 1, stepMs: 8 });
    const slow = sample({ from: 800, to: 400, velocity: 1, stepMs: 32 });

    for (const { at, value } of slow.values) {
      const match = fast.values.find((sampleAt) => Math.abs(sampleAt.at - at) < 1e-9);
      if (!match) continue;
      expect(match.value).toBeCloseTo(value, 6);
    }
    expect(slow.values.length).toBeLessThan(fast.values.length);
  });

  it("overshoots a little with the shipped defaults, and settles", () => {
    const { values, done } = sample({ from: 800, to: 400, stepMs: 16 });
    const lowest = Math.min(...values.map((v) => v.value));
    expect(lowest).toBeLessThan(400);
    // A sheet that visibly bounces past its snap by a tenth of its travel would
    // read as broken rather than lively.
    expect(lowest).toBeGreaterThan(400 - 40);
    expect(done).toBe(true);
  });

  it("does not overshoot when friction puts it at or past critical damping", () => {
    const { values, done } = sample({
      from: 800,
      to: 400,
      stepMs: 16,
      config: { attraction: 0.05, friction: 0.9 },
    });
    expect(Math.min(...values.map((v) => v.value))).toBeGreaterThanOrEqual(400);
    expect(done).toBe(true);
  });

  it("stops where it was when cancelled, so a finger can take it back", () => {
    let t = 0;
    const seen: number[] = [];
    const frame: { pending: ((time: number) => void) | null } = { pending: null };
    const cancel = runSpring({
      from: 800,
      to: 400,
      velocity: 0,
      onFrame: (v) => seen.push(v),
      raf: (cb) => {
        frame.pending = cb;
        return 1;
      },
      cancelRaf: () => {
        frame.pending = null;
      },
      now: () => t,
    });

    for (let i = 0; i < 3 && frame.pending; i++) {
      const cb = frame.pending;
      frame.pending = null;
      t += 16;
      cb(t);
    }
    const atCancel = seen.length;
    cancel();
    expect(frame.pending).toBeNull();
    expect(seen.length).toBe(atCancel);
    expect(seen[atCancel - 1]).not.toBe(400);
  });
});
