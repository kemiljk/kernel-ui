import { useCallback, useState } from "react";

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
