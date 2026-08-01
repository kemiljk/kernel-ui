/** Returns true when the user has asked for reduced motion — exit
 * animations should finish immediately rather than waiting on CSS. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function parseCssTime(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  if (trimmed.endsWith("ms")) return (parseFloat(trimmed) || 0) / 1000;
  return parseFloat(trimmed) || 0;
}

function maxTransitionSeconds(node: HTMLElement): number {
  const style = getComputedStyle(node);
  const durations = style.transitionDuration.split(",").map(parseCssTime);
  const delays = style.transitionDelay.split(",").map(parseCssTime);
  let max = 0;
  for (let i = 0; i < durations.length; i++) {
    max = Math.max(max, durations[i]! + (delays[i] ?? 0));
  }
  const animDurations = style.animationDuration.split(",").map(parseCssTime);
  const animDelays = style.animationDelay.split(",").map(parseCssTime);
  for (let i = 0; i < animDurations.length; i++) {
    max = Math.max(max, animDurations[i]! + (animDelays[i] ?? 0));
  }
  return max;
}

/**
 * Waits for the element's exit transition/animation to finish, or
 * resolves immediately under `prefers-reduced-motion` / when no
 * transition is declared (unstyled consumers). A timeout acts as a
 * safety net when events are missed.
 */
export function waitForExitTransition(
  node: HTMLElement,
  options: { timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const { signal } = options;
  if (prefersReducedMotion() || signal?.aborted) return Promise.resolve();

  const seconds = maxTransitionSeconds(node);
  if (seconds <= 0) return Promise.resolve();

  const timeoutMs = options.timeoutMs ?? Math.ceil(seconds * 1000) + 50;

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      node.removeEventListener("transitionend", onEnd);
      node.removeEventListener("animationend", onEnd);
      clearTimeout(timer);
      signal?.removeEventListener("abort", finish);
      resolve();
    };

    const onEnd = (event: Event) => {
      if (event.target !== node) return;
      finish();
    };

    const timer = setTimeout(finish, timeoutMs);
    node.addEventListener("transitionend", onEnd);
    node.addEventListener("animationend", onEnd);
    signal?.addEventListener("abort", finish);
  });
}
