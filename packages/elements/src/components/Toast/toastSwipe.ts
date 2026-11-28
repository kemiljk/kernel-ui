/**
 * Swipe-to-dismiss for one toast. Framework-free so `<ToastViewport>` and
 * `<kernel-toast-viewport>` run the same engine; kept in lockstep with
 * `packages/react/src/components/Toast/toastSwipe.ts`.
 *
 * The gesture runs along the inline axis toward the viewport's own edge —
 * inline-end, which is right in a left-to-right page and left in a
 * right-to-left one — because that's the edge the stack is anchored to and the
 * way a toast reads as going "back where it came from". Pulling the other way
 * is allowed but rubber-banded, so the toast answers the pointer without
 * pretending that direction does anything.
 *
 * Like Sheet, the engine never owns the resting position: it writes the
 * element's own `translate` while the pointer is down (composed with the
 * stack's `--y`, so a toast arriving mid-drag still pushes this one back) and
 * hands it back to the stylesheet's transition on release.
 */

import { prefersReducedMotion, waitForExitTransition } from "../../utils/exitTransition";
import {
  capturePointer,
  DRAG_START_THRESHOLD,
  FLICK_VELOCITY,
  isInteractiveTarget,
  releasePointer,
  rubberBand,
  shouldDismiss,
  VelocityTracker,
} from "../../utils/gesture";

/** Fraction of the toast's width that dismisses on distance alone. Higher than
 * Sheet's 0.25: a toast is wide and sits beside whatever the user is working
 * on, so a quarter of its width is a small enough sideways nudge to happen by
 * accident. A deliberate swipe clears it, and a flick doesn't need it at all. */
export const TOAST_CLOSE_THRESHOLD = 0.4;

/** Dismiss velocity, px/ms. The same windowed flick bar Sheet uses. */
export const TOAST_VELOCITY_THRESHOLD = FLICK_VELOCITY;

/** How far past its own width a dismissed toast travels, so the exit clears the
 * viewport's inset and shadow rather than stopping visibly at the edge. */
const EXIT_OVERSHOOT = 1.5;

export interface ToastSwipeOptions {
  onDismiss: () => void;
}

/** Writes the live gesture to the non-inheriting `translate` property, composed
 * with the stack's `--y`. Kept out of framework state so a pointer pixel costs
 * no render and no descendant style invalidation. */
export function writeSwipe(node: HTMLElement, x: number) {
  node.style.translate = `${x}px var(--y)`;
}

/** +1 when dismissing increases `clientX` (left-to-right), -1 otherwise. */
function dismissSign(node: HTMLElement): 1 | -1 {
  return getComputedStyle(node).direction === "rtl" ? -1 : 1;
}

/** Where a settle-in-flight has the toast right now, so grabbing it mid-settle
 * continues from where it's painted instead of jumping to zero. */
function paintedOffsetX(node: HTMLElement): number {
  const value = getComputedStyle(node).translate;
  if (!value || value === "none") return 0;
  const x = parseFloat(value);
  return Number.isFinite(x) ? x : 0;
}

export function attachToastSwipe(
  node: HTMLElement,
  readOptions: () => ToastSwipeOptions,
): () => void {
  let pointerId: number | null = null;
  let startX = 0;
  let startY = 0;
  /** Inline offset (screen px) the toast was at when the pointer went down. */
  let baseX = 0;
  let sign: 1 | -1 = 1;
  let dragging = false;
  /** Travel toward dismissal at the last move, before rubber-banding. */
  let travel = 0;
  const tracker = new VelocityTracker();
  let settleAbort: AbortController | null = null;

  function clear() {
    pointerId = null;
    dragging = false;
    travel = 0;
    node.removeAttribute("data-dragging");
  }

  function settleBack() {
    settleAbort?.abort();
    const controller = new AbortController();
    settleAbort = controller;
    // Removing the gesture marker arms the stylesheet's transition before the
    // target changes; the reflow makes the next write a transition, not a jump.
    node.removeAttribute("data-dragging");
    void node.offsetWidth;
    writeSwipe(node, 0);
    void waitForExitTransition(node, { signal: controller.signal }).then(() => {
      if (controller.signal.aborted) return;
      node.style.removeProperty("translate");
      if (settleAbort === controller) settleAbort = null;
    });
  }

  function onPointerDown(event: PointerEvent) {
    if (pointerId !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // A press on the close button, or on a link or control a consumer put in
    // the toast, is a click. Starting the gesture there anyway is what used to
    // swallow close-button clicks: capture retargets the release away from the
    // button, so its click never fires.
    if (isInteractiveTarget(event.target, node)) return;

    // Grabbing a toast mid-settle continues from where it's painted.
    baseX = settleAbort ? paintedOffsetX(node) : 0;
    settleAbort?.abort();
    settleAbort = null;

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    sign = dismissSign(node);
    travel = baseX * sign;
    tracker.reset();
    tracker.add(travel, performance.now());
  }

  function onPointerMove(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    const dx = event.clientX - startX;
    const dy = event.clientY - startY;

    if (!dragging) {
      if (Math.abs(dx) < DRAG_START_THRESHOLD && Math.abs(dy) < DRAG_START_THRESHOLD) return;
      // Mostly vertical: not ours. Let it be a scroll (touch-action keeps the
      // vertical pan with the browser) or nothing at all.
      if (Math.abs(dy) > Math.abs(dx)) {
        pointerId = null;
        return;
      }
      dragging = true;
      node.setAttribute("data-dragging", "true");
      // Captured only now, so a press that never became a drag keeps its click.
      capturePointer(node, event.pointerId);
    }

    travel = (baseX + dx) * sign;
    tracker.add(travel, performance.now());
    // Reduced motion: no follow travel. The pointer is still read so a swipe
    // still dismisses, but the toast doesn't slide under it — it fades on
    // release instead.
    if (!prefersReducedMotion()) {
      writeSwipe(node, rubberBand(travel, node.offsetWidth) * sign);
    }
    if (event.cancelable) event.preventDefault();
  }

  function onPointerUp(event: PointerEvent) {
    if (event.pointerId !== pointerId) return;
    releasePointer(node, event.pointerId);
    if (!dragging) {
      clear();
      return;
    }

    if (event.type === "pointercancel") {
      clear();
      settleBack();
      return;
    }

    // The release is itself a sample: a pointer that stopped and rested fires
    // no further move, so without this a parked drag still reads as a flick.
    const finalTravel = (baseX + event.clientX - startX) * sign;
    tracker.add(finalTravel, performance.now());
    const width = node.offsetWidth;
    const dismiss = shouldDismiss({
      travel: finalTravel,
      extent: width,
      velocity: tracker.velocity,
      closeThreshold: TOAST_CLOSE_THRESHOLD,
      velocityThreshold: TOAST_VELOCITY_THRESHOLD,
    });
    clear();

    if (!dismiss) {
      settleBack();
      return;
    }

    // Exit from wherever the pointer left it, continuing in the release
    // direction: drop `data-dragging` so the closing transition applies, force
    // a reflow so the new value transitions rather than jumps, then send it
    // past the edge. An inline `translate` outranks the closing rule, which is
    // why the exit has to be written here rather than left to the stylesheet.
    void node.offsetWidth;
    if (prefersReducedMotion()) node.style.removeProperty("translate");
    else writeSwipe(node, width * EXIT_OVERSHOOT * sign);
    readOptions().onDismiss();
  }

  node.addEventListener("pointerdown", onPointerDown);
  node.addEventListener("pointermove", onPointerMove);
  node.addEventListener("pointerup", onPointerUp);
  node.addEventListener("pointercancel", onPointerUp);

  return () => {
    settleAbort?.abort();
    settleAbort = null;
    node.removeEventListener("pointerdown", onPointerDown);
    node.removeEventListener("pointermove", onPointerMove);
    node.removeEventListener("pointerup", onPointerUp);
    node.removeEventListener("pointercancel", onPointerUp);
  };
}
