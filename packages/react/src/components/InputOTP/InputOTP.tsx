import { useRef } from "react";
import type { KeyboardEvent, ClipboardEvent, ChangeEvent, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import { useControllableState } from "../../utils/useControllableState";
import styles from "./InputOTP.module.css";

export interface InputOTPProps {
  length?: number;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  /** Called once when the code first reaches `length` characters, not on
   * every subsequent render where it's still complete. */
  onComplete?: (value: string) => void;
  /** A `<fieldset>` needs a `<legend>` the same way a form field needs a
   * label; this is that legend's text. */
  label?: ReactNode;
  disabled?: boolean;
  className?: ClassNameValue<Record<string, never>>;
}

/**
 * A row of real `<input>` elements sharing one logical value: the
 * concatenated code string. Unlike RadioGroup's arrow-key roving, focus
 * here advances automatically as each digit is typed, mirroring how
 * native OTP autofill and every OTP UI users already know behaves.
 */
export function InputOTP({
  length = 6,
  value,
  defaultValue,
  onValueChange,
  onComplete,
  label,
  disabled = false,
  className,
}: InputOTPProps) {
  const [code, setCode] = useControllableState({
    value,
    defaultValue: defaultValue ?? "",
    onChange: onValueChange,
  });
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const wasCompleteRef = useRef(false);

  const cells = Array.from({ length }, (_, index) => code[index] ?? "");

  function commit(next: string) {
    setCode(next);
    if (next.length === length && !wasCompleteRef.current) {
      wasCompleteRef.current = true;
      onComplete?.(next);
    } else if (next.length < length) {
      wasCompleteRef.current = false;
    }
  }

  function focusInput(index: number) {
    inputsRef.current[index]?.focus();
  }

  function handleChange(index: number, event: ChangeEvent<HTMLInputElement>) {
    const digit = event.target.value.replace(/[^0-9]/g, "").slice(-1);
    const next = cells.slice();
    next[index] = digit;
    commit(next.join("").slice(0, length));

    if (digit && index < length - 1) {
      focusInput(index + 1);
    }
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace") {
      if (cells[index]) {
        const next = cells.slice();
        next[index] = "";
        commit(next.join(""));
        return;
      }
      if (index > 0) {
        event.preventDefault();
        const next = cells.slice();
        next[index - 1] = "";
        commit(next.join(""));
        focusInput(index - 1);
      }
      return;
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === "ArrowRight" && index < length - 1) {
      event.preventDefault();
      focusInput(index + 1);
    }
  }

  function handlePaste(index: number, event: ClipboardEvent<HTMLInputElement>) {
    const pasted = event.clipboardData.getData("text").replace(/[^0-9]/g, "");
    if (!pasted) return;
    event.preventDefault();

    const next = cells.slice();
    let lastFilled = index;
    for (let i = 0; i < pasted.length && index + i < length; i++) {
      next[index + i] = pasted[i] ?? "";
      lastFilled = index + i;
    }
    commit(next.join(""));

    const focusIndex = Math.min(lastFilled + 1, length - 1);
    focusInput(focusIndex);
  }

  return (
    <fieldset
      className={[styles.root, resolveClassName(className, {})]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
    >
      {label ? <legend className={styles.legend}>{label}</legend> : null}
      <div className={styles.cells}>
        {cells.map((digit, index) => (
          <input
            key={index}
            ref={(node) => {
              inputsRef.current[index] = node;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            autoComplete="one-time-code"
            aria-label={`Digit ${index + 1} of ${length}`}
            disabled={disabled}
            data-filled={dataAttr(Boolean(digit))}
            value={digit}
            onChange={(event) => handleChange(index, event)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            className={styles.cell}
          />
        ))}
      </div>
    </fieldset>
  );
}
