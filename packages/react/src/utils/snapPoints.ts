/**
 * Snap-point arithmetic for `Sheet`. Pure functions, no DOM — which is the
 * point: these are the rules that decide where a released gesture lands, and
 * they're worth testing without a browser.
 *
 * Snaps are percentages of the viewport's block size (`dvh`), never pixels.
 * Keeping them proportional is what makes a viewport resize free: nothing has
 * to be recomputed, because `50dvh` still means the same thing afterwards.
 *
 * Kept in lockstep with `packages/elements/src/utils/snapPoints.ts`.
 */

/** Sitting exactly on a snap leaves sub-pixel noise in the measured height, so
 * "strictly past" needs a little room — otherwise a flick from a snap resolves
 * to the snap it started on and the sheet appears not to respond. */
export const SNAP_EPSILON = 1;

/**
 * Parses snap points into an ascending, deduped list of `dvh` percentages.
 * Accepts an array (React) or a comma/whitespace-separated string (the
 * `snap-points` attribute). Anything out of the 0–100 range, or not a number, is
 * dropped rather than throwing: an author's typo shouldn't take the sheet with
 * it, and an empty result simply means "this sheet is open or dismissed".
 */
export function parseSnapPoints(value: number[] | string | null | undefined): number[] {
  if (value === null || value === undefined) return [];
  const tokens = Array.isArray(value) ? value : String(value).split(/[\s,]+/);

  const seen = new Set<number>();
  for (const token of tokens) {
    if (token === "") continue;
    const parsed = Number(token);
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 100) continue;
    seen.add(parsed);
  }
  return [...seen].sort((a, b) => a - b);
}

export interface ResolveSnapOptions {
  /** The sheet's block size at the moment of release, in px. */
  currentPx: number;
  /** Release velocity in px/ms, positive toward dismissal. */
  velocityY: number;
  /** Ascending snap heights in px. */
  snapsPx: number[];
  /** Speed past which a release counts as a flick rather than a drop. */
  flickVelocity: number;
}

/**
 * Where a released gesture should land: a snap height in px, or `null` to
 * dismiss.
 *
 * A flick steps exactly one snap in its own direction — not to the nearest, and
 * not all the way — which is what makes a sheet feel like it has detents rather
 * than momentum. Anything slower lands on whichever snap is closest to where the
 * finger left it. Running out of snaps below is what dismisses the sheet, so
 * "flick down from the shortest snap" and "drag below the shortest snap" are the
 * same gesture as far as the caller is concerned.
 */
export function resolveSnapTarget({
  currentPx,
  velocityY,
  snapsPx,
  flickVelocity,
}: ResolveSnapOptions): number | null {
  if (!snapsPx.length) return null;

  // Stepping from the current position rather than from the snap the gesture
  // started at: dragging from 40 up past 90 and then flicking up should target
  // the top, not 70.
  if (velocityY > flickVelocity) {
    const below = snapsPx.filter((px) => px < currentPx - SNAP_EPSILON);
    return below.length ? below[below.length - 1]! : null;
  }

  if (velocityY < -flickVelocity) {
    const above = snapsPx.find((px) => px > currentPx + SNAP_EPSILON);
    return above ?? snapsPx[snapsPx.length - 1]!;
  }

  return snapsPx.reduce((best, px) =>
    Math.abs(px - currentPx) < Math.abs(best - currentPx) ? px : best,
  );
}

/** Snap percentages to pixels against a viewport height. */
export function snapsToPx(snaps: number[], viewportPx: number): number[] {
  return snaps.map((snap) => (snap / 100) * viewportPx);
}
