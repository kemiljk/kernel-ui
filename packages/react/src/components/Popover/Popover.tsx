import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { mergeRefs, renderElement, type RenderProp } from "../../utils/polymorphic";
import { useFloatingPosition, type FloatingPlacement } from "../../utils/useFloatingPosition";
import styles from "./Popover.module.css";

export interface PopoverState {
  open: boolean;
}

export interface PopoverProps {
  children: ReactNode;
  placement?: FloatingPlacement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** The trigger. Rendered with `popoverTarget` wired up, so open, close,
   * toggle, outside-click, and Escape all work with zero JavaScript;
   * `open`/`onOpenChange` are there for when you also need to know or
   * control the state from outside. */
  render: RenderProp<PopoverState>;
}

/**
 * `popover="auto"` gets native light-dismiss (outside click, Escape) and
 * top-layer stacking for free. Positioning comes from
 * `useFloatingPosition`. The one bit of JavaScript is listening to the
 * native `toggle` event to mirror the popover's own open state into
 * React, everything else is declarative HTML attributes.
 */
export function Popover({
  children,
  placement = "bottom",
  open,
  onOpenChange,
  render,
}: PopoverProps) {
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open: isOpen,
    placement,
  });

  useEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    function handleToggle(event: Event) {
      const nowOpen = (event as ToggleEvent).newState === "open";
      setInternalOpen(nowOpen);
      onOpenChange?.(nowOpen);
    }
    node.addEventListener("toggle", handleToggle);
    return () => node.removeEventListener("toggle", handleToggle);
  }, [onOpenChange]);

  useEffect(() => {
    if (open === undefined) return;
    const node = popoverRef.current;
    if (!node) return;
    const isCurrentlyOpen = node.matches(":popover-open");
    if (open && !isCurrentlyOpen) node.showPopover();
    if (!open && isCurrentlyOpen) node.hidePopover();
  }, [open]);

  const trigger = renderElement(
    render,
    "button",
    {
      ref: anchorRef,
      popoverTarget: id,
      "aria-expanded": isOpen,
    },
    { open: isOpen },
  );

  return (
    <>
      {trigger}
      <div ref={mergeRefs(popoverRef, floatingRef)} id={id} popover="auto" className={styles.content}>
        {children}
      </div>
    </>
  );
}
