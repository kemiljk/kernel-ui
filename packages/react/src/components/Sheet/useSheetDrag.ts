import { useCallback, useEffect, useRef, useState } from "react";
import { attachSheetDrag, type SheetDragOptions } from "../../utils/sheetDrag";

export interface UseSheetDragOptions
  extends Omit<SheetDragOptions, "handle" | "enabled"> {
  /** Current open state. Used to clear the transform a dismissing drag left
   * behind, so the next open starts from the CSS resting position. */
  open: boolean;
  /** When false the sheet can't be dragged. */
  enabled?: boolean;
}

export interface SheetDragApi {
  /** Attach to the element that actually translates — for `Sheet`, the
   * `<dialog>` itself. */
  setNode: (node: HTMLElement | null) => void;
  /** Attach to the handle, so `handleOnly` can tell a handle drag from a body
   * drag and so handle drags can skip the scroll lock. */
  setHandle: (node: HTMLElement | null) => void;
}

/**
 * React binding for {@link attachSheetDrag}. Useful on its own for any surface
 * that should be draggable-to-dismiss and is positioned by CSS — the engine
 * only writes an inline `translate` during the gesture.
 */
export function useSheetDrag({
  open,
  enabled = true,
  ...rest
}: UseSheetDragOptions): SheetDragApi {
  // State, not a ref: the listener effect has to re-run once the element is
  // actually attached, and a ref assignment wouldn't wake it.
  const [node, setNodeState] = useState<HTMLElement | null>(null);
  const handleRef = useRef<HTMLElement | null>(null);

  // Options are read through a ref inside the pointer handlers so the listeners
  // stay attached for the life of the node, instead of being torn down and
  // rebuilt every time an inline callback prop changes identity.
  const optionsRef = useRef<SheetDragOptions>({ ...rest, enabled, handle: null });
  optionsRef.current = { ...rest, enabled, handle: handleRef.current };

  const setNode = useCallback((next: HTMLElement | null) => {
    setNodeState(next);
  }, []);

  const setHandle = useCallback((next: HTMLElement | null) => {
    handleRef.current = next;
  }, []);

  useEffect(() => {
    if (!node) return;
    const controller = attachSheetDrag(node, () => optionsRef.current);
    // A drag that ended in dismissal leaves its translate behind on purpose so
    // the exit transition can continue from it. Clear it once the sheet is
    // asked to open again, or it would start off-screen and jump.
    if (open) controller.reset();
    return () => {
      // Deliberately `detach()`, not a reset. This cleanup also runs when
      // `open` flips to false, and clearing the transform there would snap the
      // sheet back to its resting position for one frame before the exit slides
      // it out. Styles are cleared on the next open instead.
      controller.detach();
    };
  }, [node, open]);

  return { setNode, setHandle };
}
