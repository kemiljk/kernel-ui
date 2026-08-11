/**
 * A damped spring, solved rather than stepped.
 *
 * Kernel's motion baseline is CSS transitions, and that stays true for
 * everything reversible. A snap settle is the one case a curve can't express:
 * the sheet has to leave at the speed the finger was actually moving, and a
 * `cubic-bezier` has no way to take an initial velocity. So this exists for
 * exactly that, and nothing else reaches for it.
 *
 * The equation is solved once, at the start, and then *evaluated* at absolute
 * elapsed time. The obvious alternative — integrating one frame at a time —
 * makes the trajectory depend on how the frames happen to land: a 120Hz display
 * and a 60Hz display take measurably different paths, and a dropped frame
 * stretches the animation. A damped harmonic oscillator has a closed-form
 * solution, so frame rate, jitter and stalls decide only *when* the motion is
 * sampled, never what the motion is.
 *
 * `attraction` and `friction` are kept as the parameters rather than the
 * physicist's stiffness/damping, because they're the two dials that were tuned
 * by feel and the numbers below are the tuned values. The mapping: reading the
 * per-frame recurrence `v += attraction * (target - x)` and `v *= 1 - friction`
 * as an ODE in frame-time makes `attraction` the spring constant and
 * `-ln(1 - friction)` the decay rate.
 *
 * Kept in lockstep with `packages/react/src/utils/spring.ts`.
 */

/** One frame at the 60fps baseline. Time is measured in frames throughout so
 * `attraction` and `friction` keep the per-frame meaning they were tuned with. */
const FRAME_MS = 16.66;

/** Below this, |damping ratio - 1| counts as critically damped — the underdamped
 * and overdamped forms both divide by zero there. */
const CRITICAL_EPSILON = 1e-9;

/** Close enough to the target, and slow enough, to call it landed. Without a
 * rest test an underdamped spring rings below the pixel grid forever. */
const REST_DISPLACEMENT = 0.1;
const REST_VELOCITY = 0.05;

export interface SpringConfig {
  /** Pull toward the target, 0–1 exclusive. Higher is faster and springier. */
  attraction: number;
  /** Bleed-off of the speed that pull builds, 0–1 exclusive. Higher settles
   * sooner and overshoots less. */
  friction: number;
}

/** The values the reference implementation settled on, and they feel right for a
 * sheet: a little overshoot, gone in about a third of a second. */
export const DEFAULT_SPRING: SpringConfig = { attraction: 0.065, friction: 0.3 };

export function normalizeSpring(config?: Partial<SpringConfig> | null): SpringConfig {
  const attraction = config?.attraction;
  const friction = config?.friction;
  return {
    attraction:
      Number.isFinite(attraction) && attraction! > 0 && attraction! < 1
        ? attraction!
        : DEFAULT_SPRING.attraction,
    friction:
      Number.isFinite(friction) && friction! > 0 && friction! < 1
        ? friction!
        : DEFAULT_SPRING.friction,
  };
}

/** Parses a `spring="0.065,0.3"` attribute. Anything unparseable falls back to
 * the defaults per-field rather than throwing. */
export function parseSpring(value: string | null | undefined): SpringConfig {
  if (!value) return DEFAULT_SPRING;
  const [attraction, friction] = String(value)
    .split(/[\s,]+/)
    .map((part) => Number(part));
  return normalizeSpring({ attraction, friction });
}

interface Solution {
  /** Displacement from the target, in units. */
  at(frames: number): { displacement: number; velocity: number };
}

/**
 * Solves for a given starting displacement and velocity. Velocity is in units
 * per frame, matching the parameterisation.
 */
function solve(config: SpringConfig, displacement: number, velocity: number): Solution {
  const naturalFrequency = Math.sqrt(config.attraction);
  const dampingRate = -Math.log(1 - config.friction);
  const dampingRatio = dampingRate / (2 * naturalFrequency);

  if (Math.abs(dampingRatio - 1) < CRITICAL_EPSILON) {
    const a = displacement;
    const b = velocity + naturalFrequency * displacement;
    return {
      at(frames) {
        const decay = Math.exp(-naturalFrequency * frames);
        return {
          displacement: (a + b * frames) * decay,
          velocity: (b - naturalFrequency * (a + b * frames)) * decay,
        };
      },
    };
  }

  if (dampingRatio < 1) {
    const damped = naturalFrequency * Math.sqrt(1 - dampingRatio * dampingRatio);
    const a = displacement;
    const b = (velocity + dampingRatio * naturalFrequency * displacement) / damped;
    return {
      at(frames) {
        const decay = Math.exp(-dampingRatio * naturalFrequency * frames);
        const cos = Math.cos(damped * frames);
        const sin = Math.sin(damped * frames);
        const value = decay * (a * cos + b * sin);
        return {
          displacement: value,
          velocity:
            decay * (damped * (-a * sin + b * cos)) - dampingRatio * naturalFrequency * value,
        };
      },
    };
  }

  const spread = naturalFrequency * Math.sqrt(dampingRatio * dampingRatio - 1);
  const root1 = -dampingRatio * naturalFrequency + spread;
  const root2 = -dampingRatio * naturalFrequency - spread;
  const a = (velocity - root2 * displacement) / (root1 - root2);
  const b = displacement - a;
  return {
    at(frames) {
      const first = a * Math.exp(root1 * frames);
      const second = b * Math.exp(root2 * frames);
      return {
        displacement: first + second,
        velocity: root1 * first + root2 * second,
      };
    },
  };
}

export interface SpringRunOptions {
  from: number;
  to: number;
  /** Rate of change of the *value*, in units per millisecond — so for a sheet
   * whose value is its height, a gesture heading for dismissal (shrinking the
   * sheet) arrives here negative. The caller owns that sign flip, because only
   * it knows which way its own axis runs. */
  velocity: number;
  config?: Partial<SpringConfig> | null;
  onFrame: (value: number) => void;
  onDone?: () => void;
  /** Injected for tests; defaults to `requestAnimationFrame`. */
  raf?: (cb: (time: number) => void) => number;
  cancelRaf?: (handle: number) => void;
  now?: () => number;
}

/**
 * Runs a spring from `from` to `to`, calling `onFrame` with the current value.
 * Returns a cancel function; cancelling leaves the value wherever it was, which
 * is what lets a finger take the sheet back mid-settle.
 */
export function runSpring({
  from,
  to,
  velocity,
  config,
  onFrame,
  onDone,
  raf = requestAnimationFrame,
  cancelRaf = cancelAnimationFrame,
  now = () => performance.now(),
}: SpringRunOptions): () => void {
  const resolved = normalizeSpring(config);
  // Velocity arrives per-millisecond because that's what a pointer gesture
  // measures; the solution works in frames.
  const solution = solve(resolved, from - to, velocity * FRAME_MS);
  const start = now();
  let handle = 0;
  let cancelled = false;

  const tick = () => {
    if (cancelled) return;
    const frames = (now() - start) / FRAME_MS;
    const { displacement, velocity: v } = solution.at(frames);

    if (Math.abs(displacement) < REST_DISPLACEMENT && Math.abs(v) < REST_VELOCITY) {
      onFrame(to);
      onDone?.();
      return;
    }

    onFrame(to + displacement);
    handle = raf(tick);
  };

  handle = raf(tick);

  return () => {
    cancelled = true;
    cancelRaf(handle);
  };
}
