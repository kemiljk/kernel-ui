/**
 * Warm-up shared by every Tooltip on the page. The first tooltip waits for
 * its open delay; once one has been shown, moving to a neighbour opens the
 * next immediately and without an enter transition, the way native toolbars
 * behave. It stays warm while a tooltip is open and for WARM_MS after the
 * last one closes, so scanning a row of icon buttons doesn't stall on every
 * one.
 */
const WARM_MS = 300;
let openCount = 0;
let lastClosedAt = -Infinity;

export function isTooltipGroupWarm(now = performance.now()) {
  return openCount > 0 || now - lastClosedAt < WARM_MS;
}

export function markTooltipOpen() {
  openCount += 1;
}

export function markTooltipClosed(now = performance.now()) {
  openCount = Math.max(0, openCount - 1);
  lastClosedAt = now;
}
