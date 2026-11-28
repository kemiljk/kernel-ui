import { useCallback, useEffect, useState } from "react";
import {
  createChangeDetails,
  trackInputModality,
  type ChangeDetails,
  type ChangeEventSource,
} from "./changeDetails";

/** Standard controlled/uncontrolled split: pass `value` to drive it
 * yourself, or `defaultValue` and let the component own its own state. */
export function useControllableState<T>(options: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T) => void;
}): [T, (value: T) => void] {
  const { value, defaultValue, onChange } = options;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : uncontrolled;

  const setValue = useCallback(
    (next: T) => {
      if (!isControlled) setUncontrolled(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );

  return [current, setValue];
}

/**
 * `useControllableState` plus a reason and a veto. The setter takes the
 * reason for the change (and the event behind it), calls
 * `onChange(next, details)` *first*, and only then updates the uncontrolled
 * value — unless the callback called `details.cancel()`. It returns `true`
 * when the change went ahead, so a component can skip a side effect (close
 * a menu, clear a draft) for a vetoed one.
 *
 * Like `useControllableState`, the setter is not a functional updater:
 * calling it twice in one handler reads the same `current` both times.
 * Fold a batch into one value and call it once (see `TagInput`).
 */
export function useControllableStateWithDetails<T, Reason extends string>(options: {
  value?: T;
  defaultValue: T;
  onChange?: (value: T, details: ChangeDetails<Reason>) => void;
}): [T, (next: T, reason: Reason, event?: ChangeEventSource) => boolean] {
  const { value, defaultValue, onChange } = options;
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : uncontrolled;

  useEffect(trackInputModality, []);

  const setValue = useCallback(
    (next: T, reason: Reason, event?: ChangeEventSource) => {
      const details = createChangeDetails(reason, event);
      onChange?.(next, details);
      if (details.isCanceled) return false;
      if (!isControlled) setUncontrolled(next);
      return true;
    },
    [isControlled, onChange],
  );

  return [current, setValue];
}

/** Calls an optional change callback with fresh details and reports
 * whether it went ahead — for components whose state isn't a plain
 * controllable value (open state mirrored from a native popover, say). */
export function emitChange<T, Reason extends string>(
  onChange: ((value: T, details: ChangeDetails<Reason>) => void) | undefined,
  next: T,
  reason: Reason,
  event?: ChangeEventSource,
): boolean {
  const details = createChangeDetails(reason, event);
  onChange?.(next, details);
  return !details.isCanceled;
}
