import { useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { mergeRefs, renderElement, type RenderProp } from "../../utils/polymorphic";
import { useFloatingPosition, type FloatingPlacement } from "../../utils/useFloatingPosition";
import styles from "./Tooltip.module.css";

export interface TooltipProps {
  content: ReactNode;
  placement?: FloatingPlacement;
  /** The element that triggers the tooltip on hover/focus. */
  render: RenderProp;
}

/**
 * Uses the Popover API (`popover="manual"`, since we drive it from
 * hover/focus rather than a click toggle) for the top-layer stacking and
 * `showPopover()`/`hidePopover()` for visibility, and `useFloatingPosition`
 * for placement.
 *
 * `interestfor` is declared on the trigger as a forward-looking, purely
 * additive enhancement: it's the emerging native hover-intent attribute
 * that's meant to make the hover/focus wiring below unnecessary
 * eventually. Today, the `onMouseEnter`/`onFocus` handlers are what
 * actually shows and hides the tooltip in every browser.
 */
export function Tooltip({ content, placement = "top", render }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
  });

  function show() {
    setOpen(true);
    popoverRef.current?.showPopover?.();
  }

  function hide() {
    setOpen(false);
    popoverRef.current?.hidePopover?.();
  }

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      "aria-describedby": id,
      interestfor: id,
      onMouseEnter: show,
      onMouseLeave: hide,
      onFocus: show,
      onBlur: hide,
    },
    {},
  );

  return (
    <>
      {trigger}
      <div
        ref={mergeRefs(popoverRef, floatingRef)}
        id={id}
        role="tooltip"
        popover="manual"
        className={styles.content}
      >
        {content}
      </div>
    </>
  );
}
