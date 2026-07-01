import { useEffect, useId, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { mergeRefs, renderElement, type RenderProp } from "../../utils/polymorphic";
import { useFloatingPosition, type FloatingPlacement } from "../../utils/useFloatingPosition";
import styles from "./HoverCard.module.css";

export interface HoverCardProps {
  content: ReactNode;
  placement?: FloatingPlacement;
  /** The element that triggers the card on hover/focus. */
  render: RenderProp;
  /** Delay before showing on hover, in milliseconds. Focus shows
   * near-instantly regardless, a keyboard user tabbing to the trigger
   * shouldn't have to wait out a mouse-tuned delay. */
  openDelay?: number;
  /** Delay before hiding once the pointer leaves both the trigger and
   * the card, in milliseconds. */
  closeDelay?: number;
}

/**
 * A heavier Tooltip: same `useFloatingPosition` + `popover="manual"` +
 * hover/focus-triggered mechanism, but for richer content that can be
 * multi-line and interactive (a link inside the card, say). That
 * interactivity is why open/close aren't instant like Tooltip's:
 * `openDelay` avoids flashing a card for every pointer pass, and
 * `closeDelay` gives the pointer time to travel from the trigger into
 * the card itself before it closes out from under it. Both timers are
 * cancelled if the pointer re-enters either element before they fire.
 *
 * `popover="manual"` because that custom timing is exactly what
 * `popover="auto"`'s built-in light-dismiss doesn't support, the same
 * reasoning Combobox uses for its listbox.
 *
 * `interestfor` is declared on the trigger for the same forward-looking
 * reason Tooltip declares it: a purely additive stand-in for the
 * emerging native hover-intent API, today the handlers below do the
 * actual work.
 */
export function HoverCard({
  content,
  placement = "bottom",
  render,
  openDelay = 400,
  closeDelay = 200,
}: HoverCardProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const openTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open,
    placement,
  });

  useEffect(() => {
    return () => {
      clearTimeout(openTimeoutRef.current);
      clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  function show(delay: number) {
    clearTimeout(closeTimeoutRef.current);
    clearTimeout(openTimeoutRef.current);
    openTimeoutRef.current = setTimeout(() => {
      setOpen(true);
      popoverRef.current?.showPopover?.();
    }, delay);
  }

  /** Touch synthesizes pointerenter/pointerleave on tap with no real
   * "hovering" in between, so a touch tap would otherwise trigger this
   * mouse-tuned open-delay affordance for an input that has no hover
   * concept at all; `onFocus` (below) already covers tap-to-reveal. */
  function showOnHover(event: { pointerType: string }, delay: number) {
    if (event.pointerType === "touch") return;
    show(delay);
  }

  function scheduleHide() {
    clearTimeout(openTimeoutRef.current);
    closeTimeoutRef.current = setTimeout(() => {
      setOpen(false);
      popoverRef.current?.hidePopover?.();
    }, closeDelay);
  }

  function cancelHide() {
    clearTimeout(closeTimeoutRef.current);
  }

  const trigger = renderElement(
    render,
    "a",
    {
      ref: anchorRef,
      "aria-describedby": id,
      interestfor: id,
      onPointerEnter: (event: ReactPointerEvent) => showOnHover(event, openDelay),
      onPointerLeave: scheduleHide,
      onFocus: () => show(0),
      onBlur: scheduleHide,
    },
    {},
  );

  return (
    <>
      {trigger}
      <div
        ref={mergeRefs(popoverRef, floatingRef)}
        id={id}
        role="group"
        popover="manual"
        className={styles.content}
        onPointerEnter={cancelHide}
        onPointerLeave={scheduleHide}
      >
        {content}
      </div>
    </>
  );
}
