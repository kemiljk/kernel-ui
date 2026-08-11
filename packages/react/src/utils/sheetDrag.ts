/**
 * Drag-to-dismiss for an element that is already positioned and animated by
 * CSS — in Kernel's case a `<dialog side="…">`. Framework-free on purpose:
 * `useSheetDrag` wraps this for React, and `@kernelui-lib/elements` ships the
 * same engine for `<kernel-sheet>`.
 *
 * Kept in lockstep with `packages/elements/src/utils/sheetDrag.ts` (the two
 * packages deliberately don't share code — `exitTransition.ts` and
 * `detailsTransition.ts` are duplicated the same way), so any fix here belongs
 * in both files or neither.
 *
 * The engine never owns the resting position. It writes an inline `translate`
 * while the finger is down and clears it on release, letting the component's
 * own CSS transition carry the element the rest of the way. That is what lets a
 * drag which ends in dismissal continue smoothly from wherever the finger left
 * it, rather than snapping back to a keyframe's starting position first.
 */

export type SheetSide = "bottom" | "top" | "left" | "right";

/** Fraction of the sheet that must be travelled to dismiss on distance alone.
 * Vaul's value, and still the right one — it's a proportion, so nothing about
 * how velocity is measured affects it. */
export const DEFAULT_CLOSE_THRESHOLD = 0.25;

/**
 * Dismiss speed, px/ms.
 *
 * Not Vaul's 0.11, and the difference isn't a retune for its own sake: Vaul
 * averages over the whole gesture, this measures the last {@link VELOCITY_WINDOW_MS}.
 * A windowed reading is far higher than a whole-gesture average for the same
 * flick, so keeping 0.11 here would dismiss on almost any release. The pair
 * (measure, threshold) has to move together; only the pair is meaningful.
 */
export const DEFAULT_VELOCITY_THRESHOLD = 0.5;

/** How much of the gesture's tail the velocity is measured over. */
const VELOCITY_WINDOW_MS = 100;

/** Upward speed, px/ms, past which a release counts as "pulling it back" and a
 * distance-based dismissal is refused. Small on purpose: it only has to catch a
 * deliberate reversal, not ordinary jitter at the end of a drag. */
const REVERSAL_VELOCITY = 0.05;

/**
 * Release speed along the dismiss axis, from a short window of recent samples
 * rather than the whole gesture.
 *
 * Averaging the whole gesture gets two things wrong that users notice. A drag
 * that travels a long way and then stops dead still reports a fast flick, so
 * the sheet leaves when the finger had visibly parked. And a drag that reverses
 * before release keeps reporting the direction it came from, so the sheet exits
 * *away* from the finger that just pulled it back.
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

/** Movement, in px along the dismiss axis, before the gesture is claimed. Below
 * this a pointerdown is still a tap, so buttons and links inside keep working. */
const DRAG_START_THRESHOLD = 4;

/** Rubber-band constant. Lower is stiffer; 0.55 is the iOS-ish feel. */
const OVERDRAG_RESISTANCE = 0.55;

interface SheetAxis {
  /** Which coordinate moves the sheet. */
  axis: "x" | "y";
  /** Sign of travel that dismisses: +1 when dismissing increases the
   * coordinate (bottom/right), -1 when it decreases it (top/left). */
  sign: 1 | -1;
  /** Which end of a scroll container must be reached before a drag may start. */
  scrollEdge: "start" | "end";
}

const AXES: Record<SheetSide, SheetAxis> = {
  bottom: { axis: "y", sign: 1, scrollEdge: "start" },
  top: { axis: "y", sign: -1, scrollEdge: "end" },
  right: { axis: "x", sign: 1, scrollEdge: "start" },
  left: { axis: "x", sign: -1, scrollEdge: "end" },
};

/**
 * Resistance for dragging *away* from the dismiss direction. Things in the
 * real world slow down before they stop, so rather than clamping at zero the
 * overdrag is compressed asymptotically — it keeps answering the finger, just
 * less and less, and can never exceed the sheet's own size.
 *
 * The derivative at zero is `OVERDRAG_RESISTANCE`, so movement starts slower
 * than the finger and decays from there. (A logarithmic curve is the obvious
 * alternative and is wrong here: its slope at zero exceeds 1, so the first few
 * pixels of overdrag would outrun the finger.)
 */
function damp(overdrag: number, extent: number): number {
  if (overdrag <= 0 || extent <= 0) return 0;
  return (1 - 1 / ((overdrag * OVERDRAG_RESISTANCE) / extent + 1)) * extent;
}

/** Nearest scrollable ancestor between `from` and `boundary`, inclusive of
 * `from` and exclusive of `boundary`. Null when nothing in that chain actually
 * scrolls, which is the common case for a short sheet. */
function findScrollable(from: Element | null, boundary: Element, axis: "x" | "y"): Element | null {
  let node: Element | null = from;
  while (node && node !== boundary) {
    const style = getComputedStyle(node);
    const overflow = axis === "y" ? style.overflowY : style.overflowX;
    const scrolls = overflow === "auto" || overflow === "scroll";
    const overflows =
      axis === "y" ? node.scrollHeight > node.clientHeight : node.scrollWidth > node.clientWidth;
    if (scrolls && overflows) return node;
    node = node.parentElement;
  }
  return null;
}

/** Pointer capture is a progressive enhancement: it keeps the gesture tracking
 * once the finger leaves the sheet. Every engine that ships pointer events has
 * it, but test environments (jsdom) don't, and the drag works without it — so
 * neither call is allowed to throw. */
function capturePointer(node: HTMLElement, pointerId: number) {
  try {
    node.setPointerCapture?.(pointerId);
  } catch {
    // Element detached mid-gesture; the pointerup path still cleans up.
  }
}

function releasePointer(node: HTMLElement, pointerId: number) {
  try {
    if (node.hasPointerCapture?.(pointerId)) node.releasePointerCapture(pointerId);
  } catch {
    // Same.
  }
}

function isAtEdge(el: Element, axis: "x" | "y", edge: "start" | "end"): boolean {
  const offset = axis === "y" ? el.scrollTop : el.scrollLeft;
  if (edge === "start") return offset <= 0;
  const max =
    axis === "y" ? el.scrollHeight - el.clientHeight : el.scrollWidth - el.clientWidth;
  return offset >= max - 1;
}

export interface SheetDragOptions {
  side: SheetSide;
  /** When false the sheet can't be dragged at all. */
  enabled: boolean;
  /** Only the handle may start a drag. Worth setting whenever the sheet's body
   * scrolls, since it removes any contest between the two gestures. */
  handleOnly: boolean;
  /** Fraction of the sheet's own size that must be travelled to dismiss. */
  closeThreshold: number;
  /** Dismiss velocity in px/ms, applied regardless of distance travelled. */
  velocityThreshold: number;
  /** The handle element, when there is one, so `handleOnly` can tell a handle
   * drag from a body drag and so a handle drag can claim immediately. */
  handle: HTMLElement | null;
  onDismiss: () => void;
  onDrag?: (percent: number) => void;
  onRelease?: (open: boolean) => void;
}

export interface SheetDragController {
  /** Clear any inline transform and drag state, returning the element to the
   * position its stylesheet gives it. */
  reset(): void;
  /** Remove every listener. Deliberately does *not* reset styles — see the
   * comment at the call site. */
  detach(): void;
}

export function attachSheetDrag(
  node: HTMLElement,
  readOptions: () => SheetDragOptions,
): SheetDragController {
  let pointerId: number | null = null;
  let startCoord = 0;
  let lastCoord = 0;
  const tracker = new VelocityTracker();
  let dragging = false;
  let offset = 0;
  /** Whether the panel owns this gesture yet, as opposed to a content scroller. */
  let claimed = false;
  /** Where along the gesture the panel took over. Travel is measured from here,
   * not from the pointer's origin, so a handoff doesn't jump. */
  let claimOffset = 0;
  let scroller: Element | null = null;
  let suppressClick = false;
  let fromHandle = false;

  function clearDragState() {
    dragging = false;
    claimed = false;
    pointerId = null;
    scroller = null;
    offset = 0;
    claimOffset = 0;
  }

  function reset() {
    clearDragState();
    node.style.translate = "";
    node.style.removeProperty("--kernel-sheet-drag-progress");
    delete node.dataset.dragging;
  }

  function extentOf(axis: "x" | "y") {
    return axis === "y" ? node.offsetHeight : node.offsetWidth;
  }

  /** `travel` is in screen coordinates, already signed for the side. */
  function applyOffset(travel: number, axis: "x" | "y", onDrag?: (percent: number) => void) {
    // Direct style writes, not a custom property: setting a custom property
    // invalidates every descendant's computed style on each pointermove, and
    // sheets routinely render deep trees (a full article, a long list).
    node.style.translate = axis === "y" ? `0 ${travel}px` : `${travel}px 0`;

    const extent = extentOf(axis);
    const percent = extent > 0 ? Math.abs(travel) / extent : 0;
    // The backdrop is a pseudo-element and can't be styled directly, but
    // `::backdrop` inherits custom properties from its originating element, so
    // this reaches it through the cascade — no overlay node required.
    node.style.setProperty("--kernel-sheet-drag-progress", String(Math.max(0, 1 - percent)));
    onDrag?.(percent);
  }

  /**
   * Whether the panel takes the gesture over from a content scroller, asked
   * afresh on every move until it says yes.
   *
   * There used to be a timeout here as well, suppressing dragging for a while
   * after any scroll inside the sheet, to stop the tail of a flick-scroll
   * reading as a dismiss. Testing the instantaneous direction against the
   * scroll edge subsumes it: after a flick the finger either keeps pulling —
   * which is a dismiss, and should be — or it doesn't, and `move` is no longer
   * positive so nothing is claimed. The timeout also had to be skipped for
   * handle drags, because `showModal()` moving focus counts as a scroll, and it
   * would have blocked the very handoff this function exists to allow for the
   * half-second after reaching the edge.
   */
  function shouldClaim(move: number, axis: "x" | "y", scrollEdge: "start" | "end") {
    // Only reachable while a scroller owns the gesture: an uncontended one is
    // already claimed at pointerdown.
    if (!scroller) return true;
    // Moving away from dismissal is an ordinary scroll and never claims; a
    // stationary move says nothing either way.
    if (move <= 0) return false;
    return isAtEdge(scroller, axis, scrollEdge);
  }

  /**
   * A drag ends with a `click`, and pointer capture retargets that click to the
   * capture element — the dialog itself. Dialog reads a click whose target is
   * the dialog as a backdrop click and closes, so every drag that should have
   * snapped back would dismiss instead. Swallowing the click also stops a drag
   * that finishes over a button or link from activating it.
   */
  function handleClickCapture(event: MouseEvent) {
    if (!suppressClick) return;
    suppressClick = false;
    event.stopPropagation();
    event.preventDefault();
  }

  function handlePointerDown(event: PointerEvent) {
    const opts = readOptions();
    if (!opts.enabled) return;
    // Multi-touch protection: once a pointer owns the gesture, later ones are
    // ignored until release. Tracking both makes the sheet jump.
    if (pointerId !== null) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;
    // Clear any flag a previous gesture left behind, so it can never swallow
    // the click belonging to a later, unrelated press.
    suppressClick = false;

    const target = event.target as Element | null;
    // A press on the backdrop reports the dialog itself as the target, since
    // `::backdrop` is a pseudo-element with no node of its own. Without this
    // the sheet would drag from the empty space beside it — and, worse, the
    // release would land as a backdrop click and close it anyway.
    if (target === node) return;

    const handle = opts.handle;
    fromHandle = !!handle && !!target && handle.contains(target);
    if (opts.handleOnly && !fromHandle) return;

    const { axis } = AXES[opts.side];
    // A drag from the handle is never in competition with scrolling — the
    // handle is absolutely positioned outside the scroll container.
    scroller = fromHandle ? null : findScrollable(target, node, axis);

    pointerId = event.pointerId;
    // With nothing to contend with, the panel owns the gesture from the first
    // pixel. Deferring the claim to the first move would put `claimOffset` a few
    // pixels in and give every drag a small dead zone at the start.
    claimed = fromHandle || scroller === null;
    claimOffset = 0;
    startCoord = axis === "y" ? event.clientY : event.clientX;
    lastCoord = startCoord;
    // Samples are fed as `delta`, already signed for the side, so the tracker's
    // reading needs no further interpretation at release.
    tracker.reset();
    tracker.add(0, performance.now());
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const opts = readOptions();

    const { axis, sign, scrollEdge } = AXES[opts.side];
    const current = axis === "y" ? event.clientY : event.clientX;
    // Positive delta always means "toward dismissal", whichever side we're on.
    const delta = (current - startCoord) * sign;

    // Which way the pointer is travelling *right now*. `delta` is cumulative,
    // so its sign only ever reports where the pointer sits relative to where it
    // started — which can't tell a scroll that has reversed from one that
    // hasn't. A handoff needs the instantaneous direction.
    const move = (current - lastCoord) * sign;
    lastCoord = current;
    tracker.add(delta, performance.now());

    // Re-asked on every move until it succeeds, rather than decided once.
    // Deciding once meant a gesture that began as a scroll could never become a
    // drag: pull a list to its top and keep pulling, and nothing happened until
    // you lifted your finger and started again.
    if (!claimed) {
      if (!shouldClaim(move, axis, scrollEdge)) return;
      claimed = true;
      // Everything up to this instant belonged to the scroller, so travel is
      // measured from here. Without this the sheet jumps by however far the
      // finger had already moved scrolling the list.
      claimOffset = delta;
    }

    const claimedTravel = delta - claimOffset;

    // Measured from the claim, not from the pointer's origin — a handoff gets
    // its own threshold rather than inheriting one already spent on scrolling.
    if (!dragging) {
      if (Math.abs(claimedTravel) < DRAG_START_THRESHOLD) return;
      dragging = true;
      node.dataset.dragging = "";
      // Captured only now, so a tap that never became a drag doesn't swallow
      // the click. Once captured, tracking survives the pointer leaving the
      // sheet entirely.
      capturePointer(node, event.pointerId);
    }

    if (event.cancelable) event.preventDefault();
    const extent = extentOf(axis);
    const travel = claimedTravel >= 0 ? claimedTravel : -damp(-claimedTravel, extent);
    offset = travel;
    applyOffset(travel * sign, axis, opts.onDrag);
  }

  function handlePointerUp(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const opts = readOptions();
    const wasDragging = dragging;
    const travel = offset;

    releasePointer(node, event.pointerId);

    if (!wasDragging) {
      clearDragState();
      return;
    }

    suppressClick = true;

    const { axis, sign } = AXES[opts.side];
    const current = axis === "y" ? event.clientY : event.clientX;
    const extent = extentOf(axis);
    // The release is itself a sample. A finger that stops and rests fires no
    // further pointermove, so without this the window never ages past the last
    // motion and a gesture that ended stationary still reads as a full flick.
    tracker.add((current - startCoord) * sign, performance.now());
    const velocity = tracker.velocity;
    const percent = extent > 0 ? travel / extent : 0;
    // Velocity, not distance alone — a short fast flick should dismiss even
    // though it never travelled 25% of the sheet. And distance alone must not
    // dismiss when the finger was already travelling back the other way at
    // release: position stays past the threshold through an entire reversal, so
    // it's intent, not position, that decides.
    const dismiss =
      travel > 0 &&
      (velocity > opts.velocityThreshold ||
        (percent > opts.closeThreshold && velocity > -REVERSAL_VELOCITY));

    if (dismiss) {
      // The exit can't be left to the stylesheet: an inline `translate`
      // outranks any rule, so the `[data-closing]` rule could never move a
      // sheet the drag had positioned. Drive the exit inline too — drop
      // `data-dragging` to re-enable the transition, force a reflow so the new
      // value is a transition and not a jump, then send it the rest of the way
      // from wherever the finger left it.
      delete node.dataset.dragging;
      void node.offsetHeight;
      applyOffset(extent * sign, axis, opts.onDrag);
      clearDragState();
      opts.onRelease?.(false);
      opts.onDismiss();
      return;
    }

    opts.onRelease?.(true);
    reset();
  }

  node.addEventListener("pointerdown", handlePointerDown);
  node.addEventListener("pointermove", handlePointerMove);
  node.addEventListener("pointerup", handlePointerUp);
  node.addEventListener("pointercancel", handlePointerUp);
  node.addEventListener("click", handleClickCapture, { capture: true });

  return {
    reset,
    detach() {
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerup", handlePointerUp);
      node.removeEventListener("pointercancel", handlePointerUp);
      node.removeEventListener("click", handleClickCapture, { capture: true });
      clearDragState();
    },
  };
}
