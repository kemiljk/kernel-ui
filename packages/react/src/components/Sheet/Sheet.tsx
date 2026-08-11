import { forwardRef, useCallback, useMemo } from "react";
// Import order is load-bearing: `Dialog` pulls in `Dialog.module.css`, and
// `Sheet.module.css` has to land *after* it in the bundle. Sheet's per-side
// rules are specificity-matched to Dialog's (`.sheet[open][data-side="bottom"]`
// against `.content[open][data-side="bottom"]`), so source order is what
// decides them. Don't reorder these two imports.
import { Dialog, type DialogClassNames, type DialogProps } from "../Dialog/Dialog";
import { mergeRefs, resolveClassName } from "../../utils/polymorphic";
import {
  DEFAULT_CLOSE_THRESHOLD,
  DEFAULT_SCROLL_LOCK_TIMEOUT,
  DEFAULT_VELOCITY_THRESHOLD,
  type SheetSide,
} from "../../utils/sheetDrag";
import { useSheetDrag } from "./useSheetDrag";
import styles from "./Sheet.module.css";

export type { SheetSide };

export interface SheetClassNames extends DialogClassNames {
  handle?: string;
}

export interface SheetProps extends Omit<DialogProps, "side" | "className" | "classNames"> {
  /** Edge the sheet is anchored to and dismissed toward. */
  side?: SheetSide;
  /** Show the grabber. Purely an affordance — dragging works without it unless
   * `handleOnly` is set. */
  showHandle?: boolean;
  /** Restrict dragging to the handle. Worth setting whenever the sheet's body
   * scrolls, since it removes any contest between the two gestures. */
  handleOnly?: boolean;
  /** When false the sheet can't be dragged or backdrop-dismissed. */
  dismissible?: boolean;
  /** Fraction of the sheet's own size that must be dragged to dismiss. */
  closeThreshold?: number;
  /** Dismiss velocity in px/ms, applied regardless of distance travelled. */
  velocityThreshold?: number;
  /** How long after scrolling inside the sheet dragging stays suppressed. */
  scrollLockTimeout?: number;
  className?: string;
  classNames?: SheetClassNames;
  /** Fires on every drag frame with how far the sheet has travelled, 0–1. */
  onDrag?: (percent: number) => void;
  /** Fires once on release with whether the sheet stayed open. */
  onRelease?: (open: boolean) => void;
}

/**
 * An edge-anchored sheet: Kernel's `Dialog` plus the gesture layer it doesn't
 * have.
 *
 * Everything modal about this is the platform's — `Dialog` renders a real
 * `<dialog>` opened with `showModal()`, so the focus trap, top-layer stacking,
 * Escape handling, `::backdrop`, and focus restoration are native rather than
 * reimplemented, and there is no portal, no scroll-lock hack, and no
 * `aria-modal`. What's added here is drag-to-dismiss with velocity, damped
 * overdrag, and a backdrop that tracks the drag — the parts that make a sheet
 * feel like a sheet instead of a modal that happens to sit at the bottom.
 *
 * The handle is `aria-hidden` decoration (the sheet is already dismissable by
 * Escape, the close button, and the backdrop), which is why it can be
 * absolutely positioned at the anchored edge rather than needing to come first
 * in the DOM: `Dialog` puts its `<header>` first, and reordering that for a
 * decorative grabber would be the wrong trade.
 */
export const Sheet = forwardRef<HTMLDialogElement, SheetProps>(function Sheet(
  {
    side = "bottom",
    showHandle = true,
    handleOnly = false,
    dismissible = true,
    closeThreshold = DEFAULT_CLOSE_THRESHOLD,
    velocityThreshold = DEFAULT_VELOCITY_THRESHOLD,
    scrollLockTimeout = DEFAULT_SCROLL_LOCK_TIMEOUT,
    className,
    classNames,
    children,
    onDrag,
    onRelease,
    open,
    onOpenChange,
    closeOnBackdropClick = true,
    ...rest
  },
  forwardedRef,
) {
  const { handle: handleClassName, ...dialogClassNames } = classNames ?? {};

  const handleDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const { setNode, setHandle } = useSheetDrag({
    side,
    open,
    enabled: dismissible,
    handleOnly,
    closeThreshold,
    velocityThreshold,
    scrollLockTimeout,
    onDismiss: handleDismiss,
    onDrag,
    onRelease,
  });

  // Must be memoised. `mergeRefs` returns a fresh callback each call, and React
  // detaches and reattaches a callback ref whose identity changed — which tears
  // down the gesture listeners. Any re-render mid-drag (a fetch resolving, a
  // parent updating) would otherwise cancel the drag halfway through.
  const mergedRef = useMemo(() => mergeRefs(forwardedRef, setNode), [forwardedRef, setNode]);

  return (
    <Dialog
      ref={mergedRef}
      side={side}
      open={open}
      onOpenChange={onOpenChange}
      closeOnBackdropClick={dismissible && closeOnBackdropClick}
      classNames={{
        ...dialogClassNames,
        root: (state) =>
          [styles.sheet, className, resolveClassName(dialogClassNames.root, state)]
            .filter(Boolean)
            .join(" "),
      }}
      {...rest}
    >
      {showHandle ? (
        <div
          ref={setHandle}
          data-slot="sheet-handle"
          aria-hidden="true"
          className={[styles.handle, handleClassName].filter(Boolean).join(" ")}
        >
          <span className={styles.handleBar} />
        </div>
      ) : null}
      {children}
    </Dialog>
  );
});
