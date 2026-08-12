import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion, waitForExitTransition } from "./exitTransition";

/**
 * Plays a `popover="manual"` surface's exit animation *before* hiding
 * it, rather than relying on the CSS closed state to animate it
 * afterwards.
 *
 * The order matters. `hidePopover()` pulls the element out of the top
 * layer, and only Chromium can defer that (`transition: overlay …
 * allow-discrete`). Everywhere else the element is a plain
 * `position: fixed` box the instant it's hidden — re-parented into
 * whatever containing block an ancestor `transform`/`filter`/
 * `backdrop-filter` imposes, with its anchor positioning no longer
 * resolving — so an exit animation played *after* the hide visibly
 * jumps somewhere else while it fades. Animating first and hiding last
 * sidesteps that entirely, and works in every browser.
 *
 * Only usable where the component owns the close. `popover="auto"`
 * surfaces (DropdownMenu, Popover, NavigationMenu) are closed by the
 * platform's own light-dismiss, and a popover's hide is deliberately
 * not cancelable, so those fall back to the CSS path guarded in
 * @kernelui-lib/styles' reset.
 *
 * `closing` is meant to drive a `data-closing` attribute, which the
 * component's stylesheet styles at the same specificity as
 * `:popover-open` (ordered after it, so it wins while still open).
 */
export function usePopoverExit(ref: RefObject<HTMLElement | null>) {
  const [closing, setClosing] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  /** Abandons an in-flight exit, for when the surface is reopened
   * mid-animation. The transition retargets from wherever it got to. */
  const cancelExit = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setClosing(false);
  }, []);

  const playExit = useCallback(async () => {
    const node = ref.current;
    if (!node) return;

    setClosing(true);

    if (!prefersReducedMotion()) {
      const controller = new AbortController();
      abortRef.current?.abort();
      abortRef.current = controller;
      await waitForExitTransition(node, { signal: controller.signal });
      if (controller.signal.aborted) return;
      abortRef.current = null;
    }

    setClosing(false);
    // Something else may have hidden it during the wait (a second
    // outside click, an Escape landing on a parent), and hidePopover()
    // throws on a popover that isn't showing.
    try {
      node.hidePopover?.();
    } catch {
      /* already hidden */
    }
  }, [ref]);

  return { closing, playExit, cancelExit };
}
