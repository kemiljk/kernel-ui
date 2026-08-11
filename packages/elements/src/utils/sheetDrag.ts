/**
 * Drag-to-dismiss for an element that is already positioned and animated by
 * CSS — in Kernel's case a `<dialog side="…">`.
 *
 * Kept in lockstep with `packages/react/src/utils/sheetDrag.ts`. The two
 * packages deliberately don't share code (`exitTransition.ts`,
 * `detailsTransition.ts`, and `dateGrid.ts` are duplicated the same way), so
 * any fix here belongs in both files or neither.
 *
 * The engine never owns the resting position. It writes an inline `translate`
 * while the finger is down and clears it on release, letting the component's
 * own CSS transition carry the element the rest of the way. That is what lets a
 * drag which ends in dismissal continue smoothly from wherever the finger left
 * it, rather than snapping back to a keyframe's starting position first.
 */

export type SheetSide = "bottom" | "top" | "left" | "right";

/** Vaul's iterated values, kept as the defaults so a migration from it is a
 * like-for-like replacement rather than a retune. */
export const DEFAULT_CLOSE_THRESHOLD = 0.25;
export const DEFAULT_VELOCITY_THRESHOLD = 0.11;
export const DEFAULT_SCROLL_LOCK_TIMEOUT = 500;

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
  /** How long after scrolling inside the sheet dragging stays suppressed. */
  scrollLockTimeout: number;
  /** The handle element, when there is one, so `handleOnly` can tell the two
   * apart and so a handle drag can skip the scroll-lock check. */
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
  let startTime = 0;
  let dragging = false;
  let offset = 0;
  let scroller: Element | null = null;
  let lastScrollTime = 0;
  let suppressClick = false;
  let fromHandle = false;

  function clearDragState() {
    dragging = false;
    pointerId = null;
    scroller = null;
    offset = 0;
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

  // Any scroll inside the sheet parks dragging for `scrollLockTimeout`.
  // Without this the tail of a flick-scroll reads as a dismiss gesture.
  function handleScroll() {
    lastScrollTime = performance.now();
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
    startCoord = axis === "y" ? event.clientY : event.clientX;
    startTime = performance.now();
  }

  function handlePointerMove(event: PointerEvent) {
    if (pointerId !== event.pointerId) return;
    const opts = readOptions();

    const { axis, sign, scrollEdge } = AXES[opts.side];
    const current = axis === "y" ? event.clientY : event.clientX;
    // Positive delta always means "toward dismissal", whichever side we're on.
    const delta = (current - startCoord) * sign;

    if (!dragging) {
      if (Math.abs(delta) < DRAG_START_THRESHOLD) return;
      // A gesture that starts inside a scroll container belongs to that
      // container whenever it has anywhere left to go — including moving away
      // from dismissal, which is an ordinary scroll. Only when there is no
      // scroller at all does moving away become damped overdrag.
      if (scroller && (delta < 0 || !isAtEdge(scroller, axis, scrollEdge))) {
        pointerId = null;
        return;
      }
      // The scroll lock exists to stop the tail of a flick-scroll reading as a
      // dismiss. It only makes sense for a gesture that could have been that
      // scroll — a handle drag never is. Applying it there also made handle
      // drags fail intermittently right after opening, because `showModal()`
      // moves focus and the browser's own scroll-into-view counts as a scroll.
      if (!fromHandle && performance.now() - lastScrollTime < opts.scrollLockTimeout) {
        pointerId = null;
        return;
      }

      dragging = true;
      node.dataset.dragging = "";
      // Captured only now, so a tap that never became a drag doesn't swallow
      // the click. Once captured, tracking survives the pointer leaving the
      // sheet entirely.
      capturePointer(node, event.pointerId);
    }

    if (event.cancelable) event.preventDefault();
    const extent = extentOf(axis);
    const travel = delta >= 0 ? delta : -damp(-delta, extent);
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
    const extent = extentOf(axis);
    const elapsed = performance.now() - startTime;
    // Velocity, not distance alone — a short fast flick should dismiss even
    // though it never travelled 25% of the sheet.
    const velocity = elapsed > 0 ? travel / elapsed : 0;
    const percent = extent > 0 ? travel / extent : 0;
    const dismiss =
      travel > 0 && (velocity > opts.velocityThreshold || percent > opts.closeThreshold);

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
  node.addEventListener("scroll", handleScroll, { capture: true });
  node.addEventListener("click", handleClickCapture, { capture: true });

  return {
    reset,
    detach() {
      node.removeEventListener("pointerdown", handlePointerDown);
      node.removeEventListener("pointermove", handlePointerMove);
      node.removeEventListener("pointerup", handlePointerUp);
      node.removeEventListener("pointercancel", handlePointerUp);
      node.removeEventListener("scroll", handleScroll, { capture: true });
      node.removeEventListener("click", handleClickCapture, { capture: true });
      clearDragState();
    },
  };
}
