import { prefersReducedMotion, waitForExitTransition } from "./exitTransition";

/**
 * Plain-function twin of `@kernelui-lib/react`'s `useMenuMorph` — same
 * FLIP technique, same ordering caveat, no hooks. See that file for the
 * long version of why the ordering matters: the footprint override has
 * to be the panel's *first-ever* computed size (set before `show()`,
 * while the panel is still `display: none`), or there's a valid
 * "previous" box — its natural content size — for the override itself
 * to transition FROM the instant it's set, which shrinks the panel
 * once for no reason before the real release-to-natural growth plays.
 */

function triggerFootprint(trigger: HTMLElement) {
  const rect = trigger.getBoundingClientRect();
  const radius = getComputedStyle(trigger).borderRadius;
  return { width: rect.width, height: rect.height, radius };
}

/** `show` must run *inside* this function, after the footprint override
 * and before any frame paints — see the file comment above. */
export function playMorphOpen(trigger: HTMLElement, panel: HTMLElement, show: () => void) {
  if (prefersReducedMotion()) {
    show();
    return;
  }
  const footprint = triggerFootprint(trigger);
  panel.style.width = `${footprint.width}px`;
  panel.style.height = `${footprint.height}px`;
  panel.style.borderRadius = footprint.radius;
  show();

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      panel.style.removeProperty("width");
      panel.style.removeProperty("height");
      panel.style.removeProperty("border-radius");
    });
  });
}

/** Morphs the panel down to the trigger's footprint, waits for that to
 * finish, then hides — animate-first-hide-last, same as
 * `usePopoverExit`, for the same reason (a hidden popover's anchor
 * positioning stops resolving, so hiding before the shrink completes
 * would let it jump). */
export async function playMorphClose(
  trigger: HTMLElement,
  panel: HTMLElement,
  signal?: AbortSignal,
) {
  if (prefersReducedMotion()) {
    try {
      panel.hidePopover?.();
    } catch {
      /* already hidden */
    }
    return;
  }

  const footprint = triggerFootprint(trigger);
  panel.style.width = `${footprint.width}px`;
  panel.style.height = `${footprint.height}px`;
  panel.style.borderRadius = footprint.radius;

  await waitForExitTransition(panel, { signal });
  if (signal?.aborted) return;

  try {
    panel.hidePopover?.();
  } catch {
    /* already hidden */
  }
  panel.style.removeProperty("width");
  panel.style.removeProperty("height");
  panel.style.removeProperty("border-radius");
}
