import { forwardRef, useCallback, useEffect, useMemo } from "react";
import type { ReactNode } from "react";
// Import order is load-bearing: `Dialog` pulls in `Dialog.module.css`, and
// `Sheet.module.css` has to land *after* it in the bundle. Sheet's per-side
// rules are specificity-matched to Dialog's (`.sheet[open][data-side="bottom"]`
// against `.content[open][data-side="bottom"]`), so source order is what
// decides them. Don't reorder these two imports.
import { Dialog, type DialogClassNames, type DialogProps } from "../Dialog/Dialog";
import { mergeRefs, resolveClassName } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import { parseSnapPoints } from "../../utils/snapPoints";
import {
  DEFAULT_CLOSE_THRESHOLD,
  DEFAULT_VELOCITY_THRESHOLD,
  type SheetSide,
} from "../../utils/sheetDrag";
import { useSheetDrag } from "./useSheetDrag";
import styles from "./Sheet.module.css";

export type { SheetSide };

export interface SheetClassNames extends DialogClassNames {
  handle?: string;
  body?: string;
  footer?: string;
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
  /** Detach the sheet from the screen edges: a gap on three sides and all four
   * corners rounded. Purely visual — the gesture is unchanged. Size the gap
   * with `--kernel-sheet-inset-inline` / `--kernel-sheet-inset-block`. */
  inset?: boolean;
  /** Viewport width, in px, above which this sheet shouldn't exist. Opening
   * wider than the limit closes it again immediately, and so does widening the
   * window past it while open — for the common case of a sheet on small
   * screens and a centred `Dialog` on large ones. */
  maxDisplayWidth?: number;
  /** Pinned below the scrolling body — an action row, a total, a Checkout
   * button. It takes over the safe-area padding from the sheet so its own
   * background runs under the home indicator instead of leaving a strip of
   * surface beneath it, and it's a drag surface like the handle. */
  footer?: ReactNode;
  /** Resting heights as percentages of the viewport — `[25, 55, 92]` for the
   * shape every maps app converges on. A flick steps exactly one snap; a slower
   * release lands on the nearest; dragging below the shortest dismisses.
   *
   * `side="bottom"` only. A snap is a block size, so the other sides would need
   * either the anchor mirrored or inline-size snapped instead; they stay binary
   * rather than half-working. */
  snapPoints?: number[];
  /** Controlled resting snap, in `dvh`. Must be one of `snapPoints`. */
  snap?: number;
  /** Snap the sheet opens at. Defaults to the tallest, which is the least
   * surprising thing for a sheet that was just asked to appear. */
  defaultSnap?: number;
  onSnapChange?: (snap: number) => void;
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
    inset = false,
    maxDisplayWidth,
    footer,
    snapPoints,
    snap,
    defaultSnap,
    onSnapChange,
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
  const {
    handle: handleClassName,
    body: bodyClassName,
    footer: footerClassName,
    ...dialogClassNames
  } = classNames ?? {};

  const handleDismiss = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  const snaps = useMemo(() => parseSnapPoints(snapPoints), [snapPoints]);
  const [activeSnap, setActiveSnap] = useControllableState<number | undefined>({
    value: snap,
    // The tallest snap: a sheet asked to appear should show as much of itself as
    // it's allowed to, and `defaultSnap` is there for the peek case.
    defaultValue: defaultSnap ?? snaps[snaps.length - 1],
    onChange: (next) => {
      if (next !== undefined) onSnapChange?.(next);
    },
  });

  // A width limit can't refuse to open — `open` is the caller's state, not
  // ours — so it closes instead, which lands in the same place. Measured on
  // every open as well as on resize, so a sheet opened wide never appears.
  useEffect(() => {
    if (!open || maxDisplayWidth === undefined) return;
    const check = () => {
      if (window.innerWidth > maxDisplayWidth) onOpenChange(false);
    };
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [open, maxDisplayWidth, onOpenChange]);

  const { setNode, setHandle, setFooter, snapTo } = useSheetDrag({
    side,
    open,
    enabled: dismissible,
    handleOnly,
    closeThreshold,
    velocityThreshold,
    snapPoints: snaps,
    snap: activeSnap ?? null,
    onDismiss: handleDismiss,
    onDrag,
    onRelease,
    onSnapChange: setActiveSnap,
  });

  // Only for a *later* change from the caller. The opening height comes from the
  // `snap` option instead, read when the engine resets: calling in here on mount
  // would race the engine's own attach, which happens a render later because the
  // node arrives through a callback ref.
  useEffect(() => {
    if (activeSnap !== undefined) snapTo(activeSnap);
  }, [activeSnap, snapTo]);

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
          [
            styles.sheet,
            inset ? styles.inset : null,
            className,
            resolveClassName(dialogClassNames.root, state),
          ]
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
      {/* Dialog gives one content wrapper for all children, so a footer put
          among them would scroll away with the rest. Sheet splits that wrapper
          into a scrolling body and a pinned footer instead, which is also what
          lets the footer own the safe-area padding. */}
      <div className={[styles.body, bodyClassName].filter(Boolean).join(" ")} data-slot="sheet-body">
        {children}
      </div>
      {footer !== undefined ? (
        <div
          ref={setFooter}
          data-slot="sheet-footer"
          className={[styles.footer, footerClassName].filter(Boolean).join(" ")}
        >
          {footer}
        </div>
      ) : null}
    </Dialog>
  );
});
