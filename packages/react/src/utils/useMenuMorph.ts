import { useCallback, useRef } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion, waitForExitTransition } from "./exitTransition";

/**
 * Drives `DropdownMenuMorph`'s container morph — the trigger's own
 * footprint (width/height/border-radius) becomes the panel's starting
 * point, and CSS transitions it out to the panel's own intrinsic size.
 *
 * This is a FLIP (First-Last-Invert-Play), but simplified: there's no
 * "Last" measurement step, because the panel's own stylesheet already
 * *is* the last state — `.morphContent`'s `min-inline-size`/padding/etc.
 * define what "open" looks like, the same way any other menu's does.
 * Overriding `width`/`height`/`border-radius` inline for exactly one
 * frame with the trigger's rect, then clearing that override, is enough:
 * removing an inline style is itself a value change a declared
 * `transition` animates, from whatever the override computed to
 * whatever the stylesheet now resolves to — no second measurement of
 * the panel needed, and no assumption about its content baked in here.
 *
 * Close runs the mirror image: apply the trigger's footprint as the
 * *target*, wait for that transition to finish (`waitForExitTransition`,
 * the same primitive `usePopoverExit` uses), then hide.
 */
export function useMenuMorph(
  triggerRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
) {
  const abortRef = useRef<AbortController | null>(null);

  const triggerFootprint = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return null;
    const rect = trigger.getBoundingClientRect();
    const radius = getComputedStyle(trigger).borderRadius;
    return { width: rect.width, height: rect.height, radius };
  }, [triggerRef]);

  /**
   * `show` is a callback that actually makes the panel visible (calls
   * `showPopover()`) — it has to run *inside* this function, after the
   * footprint override below and before any frame paints, not just
   * "after" it from the caller's side. Order is the whole trick: the
   * override has to be the panel's *first-ever* computed size, before
   * it's ever displayed, or there's a valid "previous" box (its natural
   * content size) for the override itself to transition FROM the
   * instant it's set — a shrink nobody asked for, followed by the real
   * release-to-natural growth retargeting off of wherever that
   * accidental shrink got to, not off the trigger's actual footprint.
   * A `display: none` element has no rendered box for a transition to
   * start from, so setting the override before `show()` is what makes
   * this the panel's first paint, with nothing to animate away from.
   */
  const playMorphOpen = useCallback(
    (show: () => void) => {
      const panel = panelRef.current;
      const footprint = triggerFootprint();
      if (!panel || !footprint) {
        show();
        return;
      }
      if (prefersReducedMotion()) {
        show();
        return;
      }

      panel.style.width = `${footprint.width}px`;
      panel.style.height = `${footprint.height}px`;
      panel.style.borderRadius = footprint.radius;
      show();

      // Two frames, matching usePopoverExit's own reasoning: the
      // override above hasn't necessarily painted yet on the same tick
      // it was set, and releasing it before that paint would collapse
      // First and Last into the same frame — no morph, just the open
      // size appearing outright.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          panel.style.removeProperty("width");
          panel.style.removeProperty("height");
          panel.style.removeProperty("border-radius");
        });
      });
    },
    [panelRef, triggerFootprint],
  );

  /** Call instead of hiding the popover directly. Morphs the panel back
   * down to the trigger's footprint, waits for that to finish, then
   * hides — same animate-first-hide-last ordering as `usePopoverExit`,
   * for the same reason (a hidden popover's anchor positioning stops
   * resolving, so hiding before the shrink completes would let it jump). */
  const playMorphClose = useCallback(async () => {
    const panel = panelRef.current;
    const footprint = triggerFootprint();
    if (!panel) return;

    if (!footprint || prefersReducedMotion()) {
      try {
        panel.hidePopover?.();
      } catch {
        /* already hidden */
      }
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    panel.style.width = `${footprint.width}px`;
    panel.style.height = `${footprint.height}px`;
    panel.style.borderRadius = footprint.radius;

    await waitForExitTransition(panel, { signal: controller.signal });
    if (controller.signal.aborted) return;
    abortRef.current = null;

    try {
      panel.hidePopover?.();
    } catch {
      /* already hidden */
    }
    panel.style.removeProperty("width");
    panel.style.removeProperty("height");
    panel.style.removeProperty("border-radius");
  }, [panelRef, triggerFootprint]);

  const cancelMorph = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
  }, []);

  return { playMorphOpen, playMorphClose, cancelMorph };
}
