import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  dataAttr,
  mergeRefs,
  renderElement,
  resolveClassName,
  type ClassNameValue,
  type RenderProp,
} from "../../utils/polymorphic";
import {
  useFloatingPosition,
  type FloatingAlign,
  type FloatingPlacement,
} from "../../utils/useFloatingPosition";
import type { ChangeDetails } from "../../utils/changeDetails";
import { attachPopoverReasons, type PopoverOpenChangeReason } from "../../utils/popoverReasons";
import { emitChange } from "../../utils/useControllableState";
import styles from "./Popover.module.css";

export type { PopoverOpenChangeReason };

export interface PopoverState {
  open: boolean;
  placement: FloatingPlacement;
  align: FloatingAlign;
}

export interface PopoverProps {
  children: ReactNode;
  placement?: FloatingPlacement;
  /** Cross-axis alignment relative to the trigger. */
  align?: FloatingAlign;
  /** Gap between the trigger and the panel, in pixels. */
  offset?: number;
  open?: boolean;
  /** Called before the popover opens or closes, with the reason:
   * `"trigger-press"`, `"escape-key"`, `"outside-press"` or
   * `"programmatic"`. `details.cancel()` keeps it as it is — an open is
   * stopped outright; a light-dismiss close (which the platform won't let
   * anyone refuse) is undone by re-showing the panel straight away. */
  onOpenChange?: (open: boolean, details: ChangeDetails<PopoverOpenChangeReason>) => void;
  /** Classes for the popover panel. */
  className?: ClassNameValue<PopoverState>;
  /** Replace the panel element (e.g. wrap with Motion). */
  renderContent?: RenderProp<PopoverState>;
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
  align = "center",
  offset = 8,
  open,
  onOpenChange,
  className,
  renderContent,
  render,
}: PopoverProps) {
  const id = useId();
  const popoverRef = useRef<HTMLDivElement>(null);
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const { anchorRef, floatingRef } = useFloatingPosition<HTMLElement, HTMLDivElement>({
    open: isOpen,
    placement,
    align,
    offset,
  });

  const state: PopoverState = { open: isOpen, placement, align };

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    const node = popoverRef.current;
    if (!node) return;
    function handleToggle(event: Event) {
      setInternalOpen((event as ToggleEvent).newState === "open");
    }
    node.addEventListener("toggle", handleToggle);
    const reasons = attachPopoverReasons(
      node,
      () => anchorRef.current,
      (next, reason, event) => emitChange(onOpenChangeRef.current, next, reason, event),
    );
    return () => {
      node.removeEventListener("toggle", handleToggle);
      reasons.dispose();
    };
  }, [anchorRef]);

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
    state,
  );

  const popup = renderElement(
    renderContent,
    "div",
    {
      ref: mergeRefs(popoverRef, floatingRef),
      id,
      popover: "auto",
      "data-slot": "popover-content",
      "data-placement": placement,
      "data-align": align,
      "data-open": dataAttr(isOpen),
      className: [styles.content, resolveClassName(className, state)].filter(Boolean).join(" "),
      children,
    },
    state,
  );

  return (
    <>
      {trigger}
      {popup}
    </>
  );
}
