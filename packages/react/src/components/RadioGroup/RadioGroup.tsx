import { createContext, useContext, useId } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./RadioGroup.module.css";

interface RadioGroupContextValue {
  name: string;
  value: string | undefined;
  setValue: (value: string) => void;
  disabled: boolean;
}

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

export interface RadioGroupProps {
  /** A `<fieldset>` needs a `<legend>` the same way a form field needs a
   * label; this is that legend's text. */
  label: ReactNode;
  name?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
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
  const [current, setCurrent] = useControllableState({
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
        onChange={() => context.setValue(value)}
        className={[styles.input, resolveClassName(className, {})]
          .filter(Boolean)
          .join(" ")}
      />
      <span className={styles.control} aria-hidden="true" />
      {children ? <span className={styles.label}>{children}</span> : null}
    </label>
  );
}
