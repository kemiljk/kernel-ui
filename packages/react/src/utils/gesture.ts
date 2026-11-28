/**
 * The shared maths behind Kernel's drag-to-dismiss gestures: Sheet's drag and
 * Toast's swipe. Velocity tracking, rubber-band resistance, the thresholds, and
 * the one decision they feed — dismiss or settle back.
 *
 * One file so the two gestures can't drift. A sheet and a toast are different
 * sizes and travel different distances, but a flick is the same flick on both,
 * and a user who learns how hard to throw one shouldn't have to relearn it for
 * the other.
 *
 * Kept in lockstep with `packages/elements/src/utils/gesture.ts`. The two
 * packages deliberately don't share code (`sheetDrag.ts`, `exitTransition.ts`
 * and `detailsTransition.ts` are duplicated the same way), so any fix here
 * belongs in both files or neither.
 */

/**
 * Dismiss speed, px/ms, measured over the last {@link VELOCITY_WINDOW_MS}.
 *
 * Not Vaul's or Sonner's 0.11, and the difference isn't a retune for its own
 * sake: both of those average over the whole gesture, this measures only the
 * tail. A windowed reading is far higher than a whole-gesture average for the
 * same flick, so 0.11 here would dismiss on almost any release, including a
 * slow drag that simply ended. The pair (measure, threshold) has to move
 * together; only the pair is meaningful.
 */
export const FLICK_VELOCITY = 0.5;

/** How much of the gesture's tail the velocity is measured over. */
export const VELOCITY_WINDOW_MS = 100;

/** Speed back toward the resting position, px/ms, past which a release counts
 * as "pulling it back" and a distance-based dismissal is refused. Small on
 * purpose: it only has to catch a deliberate reversal, not ordinary jitter at
 * the end of a drag. */
export const REVERSAL_VELOCITY = 0.05;

/** Movement, in px, before a press is claimed as a drag. Below this it's still
 * a tap or a click, so buttons and links inside keep working. */
export const DRAG_START_THRESHOLD = 4;

/** Rubber-band constant. Lower is stiffer; 0.55 is the iOS-ish feel. */
export const OVERDRAG_RESISTANCE = 0.55;

/**
 * Release speed along the dismiss axis, from a short window of recent samples
 * rather than the whole gesture.
 *
 * Averaging the whole gesture gets two things wrong that users notice. A drag
 * that travels a long way and then stops dead still reports a fast flick, so
 * the surface leaves when the finger had visibly parked. And a drag that
 * reverses before release keeps reporting the direction it came from, so the
 * surface exits *away* from the finger that just pulled it back.
 */
export class VelocityTracker {
  #samples: { coord: number; time: number }[] = [];

  add(coord: number, time: number) {
    this.#samples.push({ coord, time });
    const cutoff = time - VELOCITY_WINDOW_MS;
    let oldest = this.#samples[0];
    while (this.#samples.length > 2 && oldest && oldest.time < cutoff) {
      this.#samples.shift();
      oldest = this.#samples[0];
    }
  }

  /** Signed for the dismiss direction, like every other measure in here. */
  get velocity() {
    const samples = this.#samples;
    const last = samples[samples.length - 1];
    if (!last || samples.length < 2) return 0;

    // Walk back from the newest sample and stop at the first reversal, so a
    // gesture that turned around reports only the part after the turn. Steps of
    // zero are skipped rather than counted as a turn — a slow drag quantises to
    // them constantly, and treating those as reversals would zero the velocity
    // of every deliberate, slow flick.
    let direction = 0;
    let start = samples.length - 1;
    while (start > 0) {
      const newer = samples[start];
      const older = samples[start - 1];
      if (!newer || !older) break;
      const step = Math.sign(newer.coord - older.coord);
      if (step !== 0) {
        if (direction === 0) direction = step;
        else if (step !== direction) break;
      }
      start--;
    }

    const first = samples[start];
    if (!first) return 0;
    const elapsed = last.time - first.time;
    return elapsed === 0 ? 0 : (last.coord - first.coord) / elapsed;
  }

  reset() {
    this.#samples = [];
  }
}

/**
 * Resistance for dragging *away* from the dismiss direction. Things in the
 * real world slow down before they stop, so rather than clamping at zero the
 * overdrag is compressed asymptotically — it keeps answering the finger, just
 * less and less, and can never exceed `extent`.
 *
 * The derivative at zero is `OVERDRAG_RESISTANCE`, so movement starts slower
 * than the finger and decays from there. (A logarithmic curve is the obvious
 * alternative and is wrong here: its slope at zero exceeds 1, so the first few
 * pixels of overdrag would outrun the finger.)
 */
export function damp(overdrag: number, extent: number): number {
  if (overdrag <= 0 || extent <= 0) return 0;
  return (1 - 1 / ((overdrag * OVERDRAG_RESISTANCE) / extent + 1)) * extent;
}

/** Applies {@link damp} to the wrong-way half of a signed travel, leaving the
 * dismiss-ward half one-to-one with the finger. */
export function rubberBand(travel: number, extent: number): number {
  return travel >= 0 ? travel : -damp(-travel, extent);
}

export interface DismissDecision {
  /** Distance travelled toward dismissal, px. Negative when pulled the other way. */
  travel: number;
  /** The surface's own size along the axis, px. */
  extent: number;
  /** Release velocity toward dismissal, px/ms, from {@link VelocityTracker}. */
  velocity: number;
  /** Fraction of `extent` that dismisses on distance alone. */
  closeThreshold: number;
  /** Speed that dismisses regardless of distance. Defaults to {@link FLICK_VELOCITY}. */
  velocityThreshold?: number;
}

/**
 * Distance *or* velocity — a short fast flick should dismiss even though it
 * never travelled far. But distance alone must not dismiss when the pointer was
 * already travelling back at release: position stays past the threshold
 * through an entire reversal, so it's intent, not position, that decides.
 */
export function shouldDismiss({
  travel,
  extent,
  velocity,
  closeThreshold,
  velocityThreshold = FLICK_VELOCITY,
}: DismissDecision): boolean {
  if (travel <= 0) return false;
  if (velocity > velocityThreshold) return true;
  const fraction = extent > 0 ? travel / extent : 0;
  return fraction > closeThreshold && velocity > -REVERSAL_VELOCITY;
}

/** Pointer capture is a progressive enhancement: it keeps the gesture tracking
 * once the pointer leaves the surface. Every engine that ships pointer events
 * has it, but test environments (jsdom) don't, and the drag works without it —
 * so neither call is allowed to throw. */
export function capturePointer(node: HTMLElement, pointerId: number) {
  try {
    node.setPointerCapture?.(pointerId);
  } catch {
    // Element detached mid-gesture; the pointerup path still cleans up.
  }
}

export function releasePointer(node: HTMLElement, pointerId: number) {
  try {
    if (node.hasPointerCapture?.(pointerId)) node.releasePointerCapture(pointerId);
  } catch {
    // Same.
  }
}

/** Anything a press on which means "use this", not "drag the surface". */
const INTERACTIVE =
  'button, a[href], input, select, textarea, label, summary, [contenteditable=""], [contenteditable="true"], [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="slider"], [tabindex]:not([tabindex="-1"])';

/** Whether a press starting at `target` landed on an interactive element inside
 * `boundary` (the surface itself never counts). A gesture that started there
 * would capture the pointer and retarget the release away from the control, so
 * its click would never fire. */
export function isInteractiveTarget(target: EventTarget | null, boundary: Element): boolean {
  if (!(target instanceof Element)) return false;
  const hit = target.closest(INTERACTIVE);
  return !!hit && hit !== boundary && boundary.contains(hit);
}
