import { createContext, useContext, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { inputModality, type ChangeDetails } from "../../utils/changeDetails";
import { useControllableStateWithDetails } from "../../utils/useControllableState";
import styles from "./RadioGroup.module.css";

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  setValue: (value: string, reason: RadioGroupChangeReason, event?: Event | { nativeEvent: Event }) => boolean;
  disabled: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

/** What picked a radio: a click or tap (on the dot or its label), or the
 * arrow keys / Space. */
export type RadioGroupChangeReason = "press" | "keyboard";

export interface RadioGroupProps {
  /** A `<fieldset>` needs a `<legend>` the same way a form field needs a
   * label; this is that legend's text. */
  label: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  /** Called before the selection moves, with the reason (`"press"` or `"keyboard"`); `details.cancel()`
   * keeps the current option checked. */
  onValueChange?: (value: string, details: ChangeDetails<RadioGroupChangeReason>) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A real `<fieldset>` + `<legend>` grouping real
 * `<input type="radio">` elements sharing one `name`. Arrow-key roving
 * between options, and "exactly one selected", are both native radio
 * button behaviour, not reimplemented here.
 */
export function RadioGroup({
  label,
  name,
  value,
  defaultValue,
  onValueChange,
  disabled = false,
  children,
  className,
}: RadioGroupProps) {
  const generatedName = useId();
  const [current, setCurrent] = useControllableStateWithDetails({
    value,
    defaultValue: defaultValue ?? "",
    onChange: onValueChange,
  });

  return (
    <RadioGroupContext.Provider
      value={{
        name: name ?? generatedName,
        value: current || undefined,
        setValue: setCurrent,
        disabled,
      }}
    >
      <fieldset
        className={[styles.root, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
        disabled={disabled}
      >
        <legend className={styles.legend}>{label}</legend>
        <div className={styles.options}>{children}</div>
      </fieldset>
    </RadioGroupContext.Provider>
  );
}

export interface RadioGroupItemProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "className" | "type" | "name" | "checked" | "onChange"
  > {
  value: string;
  className?: ClassNameValue<Record<string, never>>;
}

export function RadioGroupItem({
  value,
  children,
  className,
  ...rest
}: RadioGroupItemProps) {
  const context = useContext(RadioGroupContext);
  if (!context) {
    throw new Error("RadioGroupItem must be used inside a RadioGroup.");
  }

  return (
    <label className={styles.item}>
      <input
        {...rest}
        type="radio"
        name={context.name}
        value={value}
        checked={context.value === value}
        disabled={context.disabled || rest.disabled}
        onChange={(event) => {
          // A vetoed change needs no DOM fix-up: `checked` is controlled, so
          // React restores the radio group when the state doesn't move.
          context.setValue(value, inputModality(event) === "keyboard" ? "keyboard" : "press", event);
        }}
        className={[styles.input, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      />
      <span className={styles.control} aria-hidden="true" />
      {children ? <span className={styles.label}>{children}</span> : null}
    </label>
  );
}
