import { forwardRef, useId, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { dataAttr, resolveClassName, type ClassNameValue } from "../../utils/polymorphic";
import styles from "./Composer.module.css";

export interface ComposerState {
  disabled: boolean;
  thinking: boolean;
}

export interface ComposerProps {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  onSubmit?: (value: string) => void;
  /** `"mod+enter"` (default): Enter alone inserts a newline, Cmd/Ctrl+Enter
   * submits — the right default for a multi-line message. `"enter"`: plain
   * Enter submits, Shift+Enter inserts a newline — closer to a single-line
   * chat box. */
  submitOn?: "mod+enter" | "enter";
  placeholder?: string;
  disabled?: boolean;
  /** Shows the animated border sweep and blocks submission — the same
   * visual language most AI products already use for "actively working",
   * applied here instead of as a standalone decorative component. */
  thinking?: boolean;
  /** A plain node, or a function receiving `submit` — so a trailing send
   * button can trigger the same Enter-key submit path (trim/empty/disabled
   * guards, uncontrolled-value clearing) instead of re-implementing it. */
  actionsLeading?: ReactNode | ((context: { submit: () => void }) => ReactNode);
  actionsTrailing?: ReactNode | ((context: { submit: () => void }) => ReactNode);
  id?: string;
  className?: ClassNameValue<ComposerState>;
}

/**
 * A chat message input: no `<form>` (a composer submits via keyboard or a
 * button, never page navigation), a real `<textarea>` growing with
 * `field-sizing: content` exactly like `Textarea`, and leading/trailing
 * action slots for attachments, model pickers, a send button, etc.
 */
export const Composer = forwardRef<HTMLTextAreaElement, ComposerProps>(function Composer(
  {
    value,
    defaultValue,
    onValueChange,
    onSubmit,
    submitOn = "mod+enter",
    placeholder,
    disabled = false,
    thinking = false,
    actionsLeading,
    actionsTrailing,
    id,
    className,
  },
  ref,
) {
  const generatedId = useId();
  const textareaId = id ?? generatedId;
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue ?? "");
  const isControlled = value !== undefined;
  const currentValue = isControlled ? value : uncontrolledValue;
  const state: ComposerState = { disabled, thinking };

  function setValue(next: string) {
    if (!isControlled) setUncontrolledValue(next);
    onValueChange?.(next);
  }

  function submit() {
    const trimmed = currentValue.trim();
    if (!trimmed || disabled || thinking) return;
    onSubmit?.(currentValue);
    if (!isControlled) setUncontrolledValue("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter") return;
    const mod = event.metaKey || event.ctrlKey;
    if (submitOn === "mod+enter" && mod) {
      event.preventDefault();
      submit();
    } else if (submitOn === "enter" && !event.shiftKey) {
      event.preventDefault();
      submit();
    }
  }

  return (
    <div
      className={[styles.root, resolveClassName(className, state)].filter(Boolean).join(" ")}
      data-disabled={dataAttr(disabled)}
      data-thinking={dataAttr(thinking)}
    >
      <textarea
        ref={ref}
        id={textareaId}
        className={styles.input}
        value={currentValue}
        onChange={(event) => setValue(event.currentTarget.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={placeholder ?? "Message"}
      />
      {actionsLeading || actionsTrailing ? (
        <div className={styles.actions}>
          <div className={styles.actionsLeading}>
            {typeof actionsLeading === "function" ? actionsLeading({ submit }) : actionsLeading}
          </div>
          <div className={styles.actionsTrailing}>
            {typeof actionsTrailing === "function" ? actionsTrailing({ submit }) : actionsTrailing}
          </div>
        </div>
      ) : null}
    </div>
  );
});
